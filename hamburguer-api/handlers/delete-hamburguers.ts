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

        const deleteRelationshipQuery = `delete from hamburguer_ingredient where hamburguer_id=${burguerId};`;
        const deleteBurguer = `DELETE FROM hamburguers WHERE id=${burguerId};`;

        await client.connect();
        await client.query(deleteRelationshipQuery);
        await client.query(deleteBurguer);

        statusCode = 200;
    } catch (err) {
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
