import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi, UserV2, TweetV2 } from 'twitter-api-v2';

export interface XUser {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

export interface XInteraction {
  user: XUser;
  retweeted: boolean;
  liked: boolean;
  replied: boolean;
  quoted: boolean;
  replyText?: string;
}

@Injectable()
export class XApiService {
  private readonly logger = new Logger(XApiService.name);
  private readonly client?: TwitterApi;

  constructor(private readonly config: ConfigService) {
    const bearerToken = this.config.get<string>('X_BEARER_TOKEN');
    if (bearerToken) {
      this.client = new TwitterApi(bearerToken);
      this.logger.log('X API Client initialized with Bearer Token.');
    } else {
      this.logger.warn('X_BEARER_TOKEN is not defined. X API calls will fall back to simulation mode.');
    }
  }

  isSimulationMode(): boolean {
    return !this.client;
  }

  // Fetch users who retweeted a tweet
  async getRetweeters(tweetId: string): Promise<XUser[]> {
    if (this.isSimulationMode()) {
      return this.getMockXUsers('rt', 60);
    }

    try {
      const result = await this.client!.v2.tweetRetweetedBy(tweetId, {
        'user.fields': ['profile_image_url'],
      });
      const users: UserV2[] = result.data || [];
      return users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      }));
    } catch (e) {
      this.logger.error(`Error fetching retweeters for tweet ${tweetId}:`, e);
      throw e;
    }
  }

  // Fetch users who liked a tweet
  async getLikingUsers(tweetId: string): Promise<XUser[]> {
    if (this.isSimulationMode()) {
      return this.getMockXUsers('like', 50);
    }

    try {
      const result = await this.client!.v2.tweetLikedBy(tweetId, {
        'user.fields': ['profile_image_url'],
      });
      const users: UserV2[] = result.data || [];
      return users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      }));
    } catch (e) {
      this.logger.error(`Error fetching liking users for tweet ${tweetId}:`, e);
      throw e;
    }
  }

  // Check if target user follows source user
  async checkFollow(targetXUserId: string, sourceXUserId: string): Promise<boolean> {
    if (this.isSimulationMode()) {
      const numId = parseInt(targetXUserId) || 0;
      return numId % 5 !== 0;
    }

    try {
      const result = await this.client!.v2.followers(sourceXUserId);
      const followers: UserV2[] = result.data || [];
      return followers.some(follower => follower.id === targetXUserId);
    } catch (e) {
      this.logger.error(`Error checking follow relationship from ${targetXUserId} to ${sourceXUserId}:`, e);
      return false;
    }
  }

  // Fetch replies and quotes
  async getRepliesAndQuotes(tweetId: string): Promise<{ replies: Array<{ userId: string; text: string }>; quotes: string[] }> {
    if (this.isSimulationMode()) {
      return {
        replies: [
          { userId: '100000000', text: 'キャンペーンに応募します！ にる' },
          { userId: '100000001', text: '当たりますように！ にる' },
          { userId: '100000002', text: 'よろしくお願いします！ にる' },
          { userId: '100000003', text: '楽しみです！ にる' },
        ],
        quotes: ['100000000', '100000001', '100000004'],
      };
    }

    try {
      const query = `conversation_id:${tweetId}`;
      const searchResult = await this.client!.v2.search(query, {
        'tweet.fields': ['author_id', 'referenced_tweets'],
        max_results: 100,
      });

      const tweets: TweetV2[] = searchResult.tweets || [];
      const replies: Array<{ userId: string; text: string }> = [];
      const quotes: string[] = [];

      for (const tweet of tweets) {
        if (tweet.referenced_tweets) {
          const isReply = tweet.referenced_tweets.some(r => r.type === 'replied_to');
          const isQuote = tweet.referenced_tweets.some(r => r.type === 'quoted');

          if (isReply && tweet.author_id) {
            replies.push({ userId: tweet.author_id, text: tweet.text });
          }
          if (isQuote && tweet.author_id) {
            quotes.push(tweet.author_id);
          }
        }
      }

      return { replies, quotes };
    } catch (e) {
      this.logger.error(`Error searching replies/quotes for tweet ${tweetId}:`, e);
      return { replies: [], quotes: [] };
    }
  }

  // Helper mock user generator
  private getMockXUsers(prefix: string, count: number): XUser[] {
    const users: XUser[] = [];
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia'];
    for (let i = 0; i < count; i++) {
      const idx = i % names.length;
      const xUserId = (100000000 + i).toString();
      users.push({
        id: xUserId,
        username: `${names[idx].toLowerCase()}_dev${i}`,
        name: `${names[idx]} Tester ${i}`,
        profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${prefix}${i}`,
      });
    }
    return users;
  }
}
