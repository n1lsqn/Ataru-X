import { ConditionType } from '../database/entities/campaign-condition.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Participant } from '../database/entities/participant.entity';

export interface ConditionEvaluator {
  type: ConditionType;
  evaluate(
    conditionParams: Record<string, any> | undefined,
    participant: Participant,
    campaign: Campaign,
    xApiToken?: string
  ): Promise<boolean>;
}
