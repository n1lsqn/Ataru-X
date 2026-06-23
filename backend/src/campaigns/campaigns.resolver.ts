import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../database/entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UsersService } from '../users/users.service';
import { DrawsService } from '../draws/draws.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Resolver(() => Campaign)
export class CampaignsResolver {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly usersService: UsersService,
    private readonly drawsService: DrawsService,
    @InjectQueue('participant-fetch') private readonly fetchQueue: Queue,
  ) {}

  @Query(() => [Campaign])
  async campaigns(): Promise<Campaign[]> {
    return this.campaignsService.findAll();
  }

  @Query(() => Campaign)
  async campaign(@Args('id', { type: () => ID }) id: string): Promise<Campaign> {
    return this.campaignsService.findOne(id);
  }

  @Mutation(() => Campaign)
  async createCampaign(@Args('input') dto: CreateCampaignDto): Promise<Campaign> {
    const owner = await this.usersService.getFirstUser();
    return this.campaignsService.create(dto, owner);
  }

  @Mutation(() => Campaign)
  async drawWinners(
    @Args('id', { type: () => ID }) id: string,
    @Args('seed', { type: () => String, nullable: true }) seed?: string,
  ): Promise<Campaign> {
    await this.drawsService.draw(id, seed);
    return this.campaignsService.findOne(id);
  }

  @Mutation(() => Campaign)
  async redrawWinners(@Args('id', { type: () => ID }) id: string): Promise<Campaign> {
    await this.drawsService.redraw(id);
    return this.campaignsService.findOne(id);
  }

  @Mutation(() => String)
  async triggerFetchParticipants(@Args('id', { type: () => ID }) id: string): Promise<string> {
    await this.campaignsService.findOne(id);
    const job = await this.fetchQueue.add('fetch', { campaignId: id });
    return job.id || 'queued';
  }
}
