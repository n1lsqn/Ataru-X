import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Campaign } from './campaign.entity';

@ObjectType()
@Entity('participants')
export class Participant {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Field()
  @Column({ name: 'user_id' })
  userId: string; // Participant's X User ID

  @Field()
  @Column()
  username: string;

  @Field()
  @Column({ name: 'display_name' })
  displayName: string;

  @Field()
  @Column({ name: 'icon_url' })
  iconUrl: string;

  @Column({ type: 'jsonb', name: 'conditions_result' })
  conditionsResult: Record<string, boolean>;

  @Field(() => String)
  get conditionsResultJson(): string {
    return JSON.stringify(this.conditionsResult || {});
  }

  @Field()
  @Column({ default: false })
  eligible: boolean;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
