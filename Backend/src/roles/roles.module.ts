import { Global, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { CustomRole, CustomRoleSchema } from './schemas/role.schema';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: CustomRole.name, schema: CustomRoleSchema }])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}