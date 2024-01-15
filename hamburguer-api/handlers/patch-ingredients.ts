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

    try {
        if (!event.body) {
            throw new AppError(404, 'Request must have a body');
        }
        const { data } = JSON.parse(event.body);

        if (Array.isArray(data)) {
            throw new AppError(404, 'Data must not be an Array');
        }
        if (!data.type) {
            throw new AppError(404, "Missing 'type'");
        }
        if (data.type !== 'ingredients') {
            throw new AppError(404, "Wrong 'type'");
        }
        if (!Number.isInteger(data.id)) {
            throw new AppError(404, 'Missing ingredient id');
        }

        query += `UPDATE ingredients SET ${Object.entries(data.attributes).map(
            ([key, value], index) => `${index !== 0 ? ', ' : ''}${key} = ${value}`,
        )} WHERE id=${data.id};`;

        await client.connect();

        const response = await client.query(query);

        if (response.rowCount === 0) {
            throw new AppError(404, 'You are trying to patch a ingredient that does not exists');
        }

        body = JSON.stringify(response);
        statusCode = 200;
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
            query,
        });
    } finally {
        await client.end();
        return {
            statusCode,
            body,
        };
    }
};
