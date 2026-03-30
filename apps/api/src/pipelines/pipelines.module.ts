import { Module } from '@nestjs/common';

import { PipelinesRouter } from './pipelines.router';
import { PipelinesService } from './pipelines.service';

@Module({
  providers: [PipelinesService, PipelinesRouter],
  exports: [PipelinesService, PipelinesRouter],
})
export class PipelinesModule {}
