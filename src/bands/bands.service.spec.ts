import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BandsService } from './bands.service';
import { Band } from '../entities/band.entity';
import { Album } from '../entities/album.entity';

describe('BandsService', () => {
  describe('create', () => {
    let service: BandsService;
    let bandRepo: {
      create: jest.Mock;
      save: jest.Mock;
    };

    beforeEach(async () => {
      bandRepo = {
        create: jest.fn((data) => data),
        save: jest.fn((data) => Promise.resolve({ id: 'band-1', ...data })),
      };
      const albumRepo = {};

      const moduleRef = await Test.createTestingModule({
        providers: [
          BandsService,
          { provide: getRepositoryToken(Band), useValue: bandRepo },
          { provide: getRepositoryToken(Album), useValue: albumRepo },
        ],
      }).compile();

      service = moduleRef.get(BandsService);
    });

    it('slugifies the band name', async () => {
      const band = await service.create({
        name: 'My Bloody Valentine',
        authorId: 'user-1',
      });
      expect(band.slug).toBe('my-bloody-valentine');
    });

    it('parses comma-separated lists into arrays', async () => {
      await service.create({
        name: 'Slowdive',
        authorId: 'user-1',
        personnel: 'Neil Halstead, Rachel Goswell',
        pastPersonnel: 'Adrian Sell',
        labels: 'Creation, Dead Oceans',
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.personnel).toEqual(['Neil Halstead', 'Rachel Goswell']);
      expect(saved.pastPersonnel).toEqual(['Adrian Sell']);
      expect(saved.labels).toEqual(['Creation', 'Dead Oceans']);
    });

    it('parses years active into Date objects', async () => {
      await service.create({
        name: 'Ride',
        authorId: 'user-1',
        yearsActive: '1988, 1996',
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.yearsActive).toHaveLength(2);
      expect(saved.yearsActive[0]).toBeInstanceOf(Date);
    });

    it('normalizes tags into an array', async () => {
      await service.create({
        name: 'Lush',
        authorId: 'user-1',
        tags: ['Female Vox', '4AD'],
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.tags).toEqual(['Female Vox', '4AD']);
    });

    it('coerces a single tag string into an array', async () => {
      await service.create({
        name: 'Chapterhouse',
        authorId: 'user-1',
        tags: 'Heavy',
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.tags).toEqual(['Heavy']);
    });

    it('persists author and image fields', async () => {
      await service.create({
        name: 'Cocteau Twins',
        authorId: 'user-9',
        imageFileId: 'file-id',
        imagePath: '/bands/cocteau-twins.jpg',
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.authorId).toBe('user-9');
      expect(saved.imageFileId).toBe('file-id');
      expect(saved.imagePath).toBe('/bands/cocteau-twins.jpg');
    });

    it('parses location coordinates into floats', async () => {
      await service.create({
        name: 'Pale Saints',
        authorId: 'user-1',
        locationAddress: 'Leeds, UK',
        locationLng: '-1.5491',
        locationLat: '53.8008',
      });
      const saved = bandRepo.save.mock.calls[0][0];
      expect(saved.locationAddress).toBe('Leeds, UK');
      expect(saved.locationLng).toBeCloseTo(-1.5491);
      expect(saved.locationLat).toBeCloseTo(53.8008);
    });
  });
});
