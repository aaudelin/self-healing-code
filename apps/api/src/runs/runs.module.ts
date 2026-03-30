import { Module, forwardRef } from '@nestjs/common';

import { ExecutionModule } from '../execution/execution.module';

import { RunsRouter } from './runs.router';
import { RunsService } from './runs.service';

@Module({
  imports: [forwardRef(() => ExecutionModule)],
  providers: [RunsService, RunsRouter],
  exports: [RunsService, RunsRouter],
})
export class RunsModule {}
