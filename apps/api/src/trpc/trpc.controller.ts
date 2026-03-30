import { All, Controller, Req, Res } from '@nestjs/common';
import {
  fetchRequestHandler,
  FetchCreateContextFnOptions,
} from '@trpc/server/adapters/fetch';
import { Request, Response } from 'express';

import { TrpcService } from './trpc.service';

@Controller('trpc')
export class TrpcController {
  constructor(private readonly trpcService: TrpcService) {}

  @All('*')
  async handler(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace('/trpc/', '');

    const fetchRequest = new globalThis.Request(
      `http://${req.headers.host}${req.originalUrl}`,
      {
        method: req.method,
        headers: req.headers as HeadersInit,
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? JSON.stringify(req.body)
            : undefined,
      },
    );

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: fetchRequest,
      router: this.trpcService.appRouter,
      createContext: (_opts: FetchCreateContextFnOptions) => ({}),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.text();
    res.send(body);
  }
}
