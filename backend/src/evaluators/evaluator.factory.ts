import { Injectable } from '@nestjs/common';
import { ConditionType } from '../database/entities/campaign-condition.entity';
import { ConditionEvaluator } from './evaluator.interface';
import { RetweetEvaluator } from './retweet.evaluator';
import { FollowEvaluator } from './follow.evaluator';
import { LikeEvaluator } from './like.evaluator';
import { ReplyEvaluator } from './reply.evaluator';
import { QuoteEvaluator } from './quote.evaluator';
import { HashtagEvaluator } from './hashtag.evaluator';
import { KeywordReplyEvaluator } from './keyword-reply.evaluator';
import { Campaign } from '../database/entities/campaign.entity';
import { Participant } from '../database/entities/participant.entity';

@Injectable()
export class EvaluatorFactory {
  private readonly evaluatorsMap: Map<ConditionType, ConditionEvaluator>;

  constructor(
    retweet: RetweetEvaluator,
    follow: FollowEvaluator,
    like: LikeEvaluator,
    reply: ReplyEvaluator,
    quote: QuoteEvaluator,
    hashtag: HashtagEvaluator,
    keywordReply: KeywordReplyEvaluator
  ) {
    this.evaluatorsMap = new Map<ConditionType, ConditionEvaluator>([
      [ConditionType.RETWEET, retweet],
      [ConditionType.FOLLOW, follow],
      [ConditionType.LIKE, like],
      [ConditionType.REPLY, reply],
      [ConditionType.QUOTE, quote],
      [ConditionType.HASHTAG, hashtag],
      [ConditionType.KEYWORD_REPLY, keywordReply],
    ]);
  }

  getEvaluator(type: ConditionType): ConditionEvaluator {
    const evaluator = this.evaluatorsMap.get(type);
    if (!evaluator) {
      throw new Error(`No evaluator implemented for type: ${type}`);
    }
    return evaluator;
  }

  async evaluateAll(
    campaign: Campaign,
    participant: Participant,
    xApiToken?: string
  ): Promise<{ results: Record<string, boolean>; eligible: boolean }> {
    const results: Record<string, boolean> = {};
    let eligible = true;

    for (const condition of campaign.conditions) {
      // If the condition is not enabled, skip it
      if (!condition.enabled) continue;

      const evaluator = this.getEvaluator(condition.type);
      const isMet = await evaluator.evaluate(condition.params, participant, campaign, xApiToken);
      results[condition.type] = isMet;

      if (!isMet) {
        eligible = false;
      }
    }

    return { results, eligible };
  }
}
