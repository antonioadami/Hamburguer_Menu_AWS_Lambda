import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';

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
        user: 'postgres',
        host: '',
        database: 'hamburguers',
        password: '',
        port: 5432,
    });

    try {
        await client.connect();

        const query = await client.query(`SELECT * FROM INGREDIENTS;`);

        body = JSON.stringify({
            message: 'connected',
            query: query.rows,
        });
    } catch (err) {
        console.log(err);
        statusCode = 500;
        body = JSON.stringify({
            message: 'some error happened',
        });
    } finally {
        await client.end();
        return {
            statusCode,
            body,
        };
    }
};
