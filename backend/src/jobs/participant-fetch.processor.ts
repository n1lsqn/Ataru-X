import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ParticipantsService } from '../participants/participants.service';
import { EvaluatorFactory } from '../evaluators/evaluator.factory';
import { Participant } from '../database/entities/participant.entity';
import { XApiService, XUser } from '../x-api/x-api.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Processor('participant-fetch')
@Injectable()
export class ParticipantFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(ParticipantFetchProcessor.name);

  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly participantsService: ParticipantsService,
    private readonly evaluatorFactory: EvaluatorFactory,
    private readonly xApiService: XApiService,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
  ) {
    super();
  }

  async process(job: Job<{ campaignId: string }, any, string>): Promise<any> {
    const { campaignId } = job.data;
    const campaign = await this.campaignsService.findOne(campaignId);

    this.logger.log(`Starting participant fetch & evaluation for Campaign: ${campaign.title} (${campaignId})`);

    // Clear old participants for this refresh
    await this.participantsService.clearCampaignParticipants(campaignId);

    const tweetId = campaign.tweetId;

    // Determine which API calls are actually needed based on enabled conditions
    const needsRetweeters = campaign.conditions.some(c => c.enabled && c.type === 'RETWEET');
    const needsLikers = campaign.conditions.some(c => c.enabled && c.type === 'LIKE');
    const needsRepliesQuotes = campaign.conditions.some(c => c.enabled && ['REPLY', 'QUOTE', 'HASHTAG', 'KEYWORD_REPLY'].includes(c.type));

    // Execute only the necessary API calls
    const [retweeters, likers, repliesQuotes] = await Promise.all([
      needsRetweeters 
        ? this.xApiService.getRetweeters(tweetId).catch(() => [] as XUser[]) 
        : Promise.resolve([] as XUser[]),
      needsLikers 
        ? this.xApiService.getLikingUsers(tweetId).catch(() => [] as XUser[]) 
        : Promise.resolve([] as XUser[]),
      needsRepliesQuotes 
        ? this.xApiService.getRepliesAndQuotes(tweetId).catch(() => ({ replies: [] as Array<{ userId: string; text: string }>, quotes: [] as string[] }))
        : Promise.resolve({ replies: [] as Array<{ userId: string; text: string }>, quotes: [] as string[] }),
    ]);

    const retweetIds = new Set(retweeters.map(u => u.id));
    const likeIds = new Set(likers.map(u => u.id));
    const replyUserIds = new Set(repliesQuotes.replies.map(r => r.userId));
    const quoteIds = new Set(repliesQuotes.quotes);

    // Aggregate unique candidate users
    const allUsersMap = new Map<string, XUser>();
    
    // Add retweeters and likers to map
    retweeters.forEach(u => allUsersMap.set(u.id, u));
    likers.forEach(u => allUsersMap.set(u.id, u));

    // If there are reply users not in map, add mock/placeholder profiles for them
    repliesQuotes.replies.forEach(r => {
      if (!allUsersMap.has(r.userId)) {
        allUsersMap.set(r.userId, {
          id: r.userId,
          username: `user_${r.userId}`,
          name: `X User ${r.userId}`,
          profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=reply${r.userId}`,
        });
      }
    });

    // Same for quotes
    repliesQuotes.quotes.forEach(userId => {
      if (!allUsersMap.has(userId)) {
        allUsersMap.set(userId, {
          id: userId,
          username: `user_${userId}`,
          name: `X User ${userId}`,
          profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=quote${userId}`,
        });
      }
    });

    // Fetch who posted the tweet dynamically
    const tweetAuthorId = await this.xApiService.getTweetAuthorId(tweetId).catch(() => '123456789');

    const participantsToSave: Participant[] = [];

    // Process and evaluate each candidate user
    for (const [userId, xUser] of allUsersMap.entries()) {
      const participant = new Participant();
      participant.campaignId = campaignId;
      participant.userId = xUser.id;
      participant.username = xUser.username;
      participant.displayName = xUser.name;
      participant.iconUrl = xUser.profileImageUrl;
      
      // Determine interactions
      const hasRetweet = retweetIds.has(userId);
      const hasLike = likeIds.has(userId);
      const hasReply = replyUserIds.has(userId);
      const hasQuote = quoteIds.has(userId);
      
      const userReply = repliesQuotes.replies.find(r => r.userId === userId);
      const replyText = userReply ? userReply.text : '';

      // Initialize base condition outcomes before detailed evaluator runs
      const conditionResults: Record<string, boolean> = {};

      // Populate results based on real X API state mapping
      for (const cond of campaign.conditions) {
        if (!cond.enabled) continue;

        let met = false;
        switch (cond.type) {
          case 'RETWEET':
            met = hasRetweet;
            break;
          case 'LIKE':
            met = hasLike;
            break;
          case 'FOLLOW':
            met = true; // Deferred validation to draw stage to save API limit
            break;
          case 'REPLY':
            met = hasReply;
            break;
          case 'QUOTE':
            met = hasQuote;
            break;
          case 'HASHTAG':
            const hashtag = cond.params?.hashtag as string || '';
            met = hasReply && replyText.toLowerCase().includes(hashtag.toLowerCase());
            break;
          case 'KEYWORD_REPLY':
            const keyword = cond.params?.keyword as string || '';
            met = hasReply && replyText.toLowerCase().includes(keyword.toLowerCase());
            break;
          default:
            met = true;
        }
        conditionResults[cond.type] = met;
      }

      participant.conditionsResult = conditionResults;
      
      // Participant is eligible if all active conditions are met
      participant.eligible = campaign.conditions
        .filter(c => c.enabled)
        .every(c => conditionResults[c.type] === true);

      participantsToSave.push(participant);
    }

    // Save all to database
    if (participantsToSave.length > 0) {
      await this.participantsService.saveMany(participantsToSave);
    }

    this.logger.log(`Fetch completed. Saved ${participantsToSave.length} participants, ${participantsToSave.filter(p => p.eligible).length} eligible.`);

    return {
      status: 'success',
      totalParticipants: participantsToSave.length,
      eligibleCount: participantsToSave.filter((p) => p.eligible).length,
    };
  }
}
