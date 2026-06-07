import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Auth E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/request-otp', () => {
    it('should request OTP for valid phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/request-otp')
        .send({ phoneNumber: '+22890000001' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/request-otp')
        .send({ phoneNumber: 'invalid' })
        .expect(400);
    });
  });
});
