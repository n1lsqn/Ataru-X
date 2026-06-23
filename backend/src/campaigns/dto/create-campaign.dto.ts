import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsOptional, IsArray, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ConditionType } from '../../database/entities/campaign-condition.entity';

@InputType()
export class CampaignConditionInput {
  @Field(() => String)
  @IsEnum(ConditionType)
  type: ConditionType;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paramsJson?: string; // We can parse parameters JSON string
}

@InputType()
export class CreateCampaignDto {
  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  postUrl: string;

  @Field(() => Int)
  @IsInt()
  winnerCount: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endAt?: Date;

  @Field(() => [CampaignConditionInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignConditionInput)
  conditions: CampaignConditionInput[];
}
