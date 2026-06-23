import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Campaign } from './campaign.entity';

@ObjectType()
@Entity('winners')
export class Winner {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.winners, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Field()
  @Column({ name: 'user_id' })
  userId: string; // Winner's X User ID

  @Field()
  @CreateDateColumn({ name: 'drawn_at' })
  drawnAt: Date;
}
