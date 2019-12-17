import https from 'https';
import { OutgoingHttpHeaders, IncomingMessage, ClientRequest } from 'http';
import http from 'http';

export function httpGet(url: string, headers?: OutgoingHttpHeaders): Promise<any> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {}
    if (headers) {
      options.headers = headers;
    }
    https.get(url, options, (resp) => {
      let data: string = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve(formatResponseData(resp, data));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export function httpPost(url: string, body: any, headers?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = typeof body !== 'string' ? JSON.stringify(body) : body;

    const {hostname, port, pathname} = new URL(url);
    const options = {
      hostname, port, pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    if (headers) {
      Object.assign(options.headers, headers);
    }

    const req = createReq(options, resolve, reject);
    req.write(data);
    req.end();
  })
}

export function httpPut(url: string, body: any, headers?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = typeof body !== 'string' ? JSON.stringify(body) : body;

    const {hostname, port, pathname} = new URL(url);

    const options = {
      hostname, port: 443, pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    if (headers) {
      Object.assign(options.headers, headers);
    }

    const req = createReq(options, resolve, reject);
    req.write(data);
    req.end();
  })
}

export function httpDelete(url: string, headers?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const {hostname, port, pathname} = new URL(url);

    const options: any = {
      hostname, port, pathname,
      method: 'DELETE',
    }

    if (headers) {
      Object.assign(options.headers, headers);
    }

    const req = createReq(options, resolve, reject);
    req.end();
  })
}

function createReq(options: https.RequestOptions, resolve: Function, reject: Function): ClientRequest {
  const req = http.request(options, (res) => {
    let data: string = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      resolve(formatResponseData(res, data));
    });
  })

  req.on('error', (error) => {
    reject(error);
  });

  return req;
}

function formatResponseData(resp: IncomingMessage, data: string) {
  if (resp.headers['content-type']?.includes('application/json')) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error(e);
    } finally {
      return data
    }
  }

  return data;
}
