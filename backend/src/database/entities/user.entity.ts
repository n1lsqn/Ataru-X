import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Campaign } from './campaign.entity';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'x_user_id', unique: true })
  xUserId: string;

  @Field()
  @Column()
  username: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ name: 'icon_url' })
  iconUrl: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field(() => [Campaign], { nullable: true })
  @OneToMany(() => Campaign, (campaign) => campaign.owner)
  campaigns: Campaign[];
}
