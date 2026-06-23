import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      await this.userRepository.save({
        id: '00000000-0000-0000-0000-000000000000',
        xUserId: '123456789',
        username: 'ataru_campaign_owner',
        name: 'Ataru Organizer',
        iconUrl: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      });
    }
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByXUserId(xUserId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { xUserId } });
  }

  async create(data: Partial<User>): Promise<User> {
    return this.userRepository.save(data);
  }

  async getFirstUser(): Promise<User> {
    const user = await this.userRepository.findOne({ where: {} });
    if (!user) {
      return this.userRepository.save({
        id: '00000000-0000-0000-0000-000000000000',
        xUserId: '123456789',
        username: 'ataru_campaign_owner',
        name: 'Ataru Organizer',
        iconUrl: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      });
    }
    return user;
  }
}
