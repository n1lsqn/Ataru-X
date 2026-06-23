import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from './user.entity';
import { CampaignCondition } from './campaign-condition.entity';
import { Participant } from './participant.entity';
import { Winner } from './winner.entity';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@ObjectType()
@Entity('campaigns')
export class Campaign {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ name: 'tweet_id' })
  tweetId: string;

  @Field(() => Int)
  @Column({ name: 'winner_count', type: 'int' })
  winnerCount: number;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt?: Date;

  @Field(() => String)
  @Column({ type: 'varchar', default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @Field({ nullable: true })
  @Column({ name: 'draw_seed', type: 'varchar', nullable: true })
  drawSeed?: string;

  @Field({ nullable: true })
  @Column({ name: 'draw_participant_hash', type: 'varchar', nullable: true })
  drawParticipantHash?: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Field(() => [CampaignCondition])
  @OneToMany(() => CampaignCondition, (condition) => condition.campaign, { cascade: true })
  conditions: CampaignCondition[];

  @Field(() => [Participant], { nullable: true })
  @OneToMany(() => Participant, (participant) => participant.campaign)
  participants: Participant[];

  @Field(() => [Winner], { nullable: true })
  @OneToMany(() => Winner, (winner) => winner.campaign)
  winners: Winner[];
}
