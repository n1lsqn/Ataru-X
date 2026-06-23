import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { XApiService } from './x-api.service';

@Module({
  imports: [ConfigModule],
  providers: [XApiService],
  exports: [XApiService],
})
export class XApiModule {}
