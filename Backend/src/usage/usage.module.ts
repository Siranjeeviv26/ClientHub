import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usage, UsageSchema } from './schemas/usage.schema';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { PlansModule } from '../plans/plans.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usage.name, schema: UsageSchema }]),
    PlansModule,
    OrganizationsModule,
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
