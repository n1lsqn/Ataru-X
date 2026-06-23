import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Campaign } from './campaign.entity';

export enum ConditionType {
  RETWEET = 'RETWEET',
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  REPLY = 'REPLY',
  QUOTE = 'QUOTE',
  HASHTAG = 'HASHTAG',
  KEYWORD_REPLY = 'KEYWORD_REPLY',
}

@ObjectType()
@Entity('campaign_conditions')
export class CampaignCondition {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Field(() => String)
  @Column({ type: 'varchar' })
  type: ConditionType;

  @Field()
  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  params?: Record<string, any>;

  @Field(() => String, { nullable: true })
  get paramsJson(): string | null {
    return this.params ? JSON.stringify(this.params) : null;
  }

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
