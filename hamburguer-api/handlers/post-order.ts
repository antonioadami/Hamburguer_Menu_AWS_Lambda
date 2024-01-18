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

    try {
        const burguerId = parseInt(event.pathParameters?.id as string);

        if (Number.isNaN(burguerId)) {
            throw new AppError(404, 'Missing burguer id path parameter');
        }

        const query = `select i.id as ingredient_id, hi.amount as needed_amount, i.amount as amount, i.name as name from hamburguers h join hamburguer_ingredient hi ON h.id = hi.hamburguer_id  join ingredients i ON hi.ingredient_id  = i.id where h.id = ${burguerId};`;

        await client.connect();
        const { rows, rowCount } = await client.query(query);

        if (rowCount === 0) {
            throw new AppError(404, 'Burguer does not exists');
        }

        const insufficientIngredients = rows.some((row) => row.amount < row.needed_amount);

        if (insufficientIngredients) {
            throw new AppError(404, 'Insufficient ingredients');
        }

        const promises = rows.map((row) => {
            const updateQuery = `UPDATE ingredients SET amount=${row.amount - row.needed_amount} WHERE id=${
                row.ingredient_id
            }`;
            return client.query(updateQuery);
        });

        await Promise.all(promises);

        statusCode = 200;
    } catch (err: any) {
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
        });
    } finally {
        await client.end();
        return {
            statusCode,
            body,
        };
    }
};
