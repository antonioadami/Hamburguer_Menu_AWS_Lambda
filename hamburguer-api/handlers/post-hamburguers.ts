import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';
import AppError from '../errors/AppError';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let statusCode = 200;
    let body = '';

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT as string),
    });
    let query = '';
    let relationshipQuery = '';

    let response: any;

    try {
        if (!event.body) {
            throw new AppError(404, 'Request must have a body');
        }
        const { data } = JSON.parse(event.body);
        const { relationships } = data;
        if (Array.isArray(data)) {
            throw new AppError(404, 'Data must not be an Array');
        }

        if (!data.type) {
            throw new AppError(404, "Missing 'type'");
        }
        if (data.type !== 'hamburguers') {
            throw new AppError(404, "Wrong 'type'");
        }

        const findBurguerQuery = `SELECT id FROM hamburguers WHERE name='${data.attributes.name}';`;

        query += `INSERT INTO hamburguers(${Object.keys(data.attributes)}) VALUES(${Object.values(data.attributes).map(
            (value) => (typeof value === 'string' ? `'${value}'` : value),
        )});`;

        await client.connect();

        const existingBurguer = await client.query(findBurguerQuery);

        if (existingBurguer.rowCount !== 0) {
            throw new AppError(404, 'Hamburguer already exists');
        }

        response = await client.query(query);

        let findIngredientQuery = 'SELECT id FROM ingredients WHERE id IN(';

        (relationships?.ingredients?.data as any[]).forEach((relationshipItem, index) => {
            if (!relationshipItem.type) {
                throw new AppError(404, "Missing 'type'");
            }
            if (relationshipItem.type !== 'ingredients') {
                throw new AppError(404, "Must be related to 'ingredient' type");
            }

            if (index !== 0) {
                findIngredientQuery += ', ';
            }
            findIngredientQuery += `'${relationshipItem.id}'`;

            relationshipQuery += `INSERT INTO hamburguer_ingredient(hamburguer_id, ingredient_id) VALUES(LASTVAL(), ${relationshipItem.id});`;
        });

        findIngredientQuery += ');';
        const existingIngredient = await client.query(findIngredientQuery);

        if (existingIngredient.rowCount !== relationships?.ingredients?.data.length) {
            throw new AppError(404, 'An ingredient on relationships does not exist');
        }

        await client.query(relationshipQuery);

        statusCode = 201;
    } catch (err) {
        console.log(err);
        let message = '';
        if (!(err instanceof AppError) || !err.statusCode) {
            statusCode = 500;
            message = 'some error happened';
        } else {
            statusCode = (err as AppError).statusCode;
            message = (err as AppError).message;
        }
        body = JSON.stringify({
            message,
            response,
            err,
        });
    } finally {
        await client.end();
        return {
            statusCode,
            body,
        };
    }
};
