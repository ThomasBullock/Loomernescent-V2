import { Repository } from 'typeorm';
import { PedalsService } from './pedals.service';
import { Pedal } from '../entities/pedal.entity';

type RepoMock = jest.Mocked<
  Pick<Repository<Pedal>, 'save' | 'findOne' | 'findAndCount' | 'delete'>
>;

describe('PedalsService', () => {
  let service: PedalsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    } as unknown as RepoMock;
    service = new PedalsService(repo as unknown as Repository<Pedal>);
  });

  describe('create', () => {
    it('generates a slug from brand and name', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: 'Big Muff', name: 'Pi' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'big-muff-pi',
          brand: 'Big Muff',
          name: 'Pi',
        }),
      );
    });

    it('lowercases and strips punctuation in slugs', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: 'Boss DD-3T', name: 'Digital Delay' });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe('boss-dd-3t-digital-delay');
    });

    it('drops pedalType2 when value is "None"', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({
        brand: 'X',
        name: 'Y',
        pedalType: 'Fuzz',
        pedalType2: 'None',
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.pedalType).toBe('Fuzz');
      expect(arg.pedalType2).toBeFalsy();
    });

    it('parses yearsManufactured CSV into Date[]', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({
        brand: 'X',
        name: 'Y',
        yearsManufactured: '1972, 1973, 1974',
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.yearsManufactured).toHaveLength(3);
      expect(arg.yearsManufactured?.[0]).toBeInstanceOf(Date);
      expect(arg.yearsManufactured?.[0].getUTCFullYear()).toBe(1972);
      expect(arg.yearsManufactured?.[2].getUTCFullYear()).toBe(1974);
    });

    it('treats missing yearsManufactured as []', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: 'X', name: 'Y' });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.yearsManufactured).toEqual([]);
    });
  });

  describe('getPedalById', () => {
    it('queries by id', async () => {
      const pedal = { id: 'abc', brand: 'X' } as Pedal;
      repo.findOne.mockResolvedValue(pedal);
      const result = await service.getPedalById('abc');
      expect(result).toBe(pedal);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'abc' } });
    });

    it('returns null when the id is malformed', async () => {
      repo.findOne.mockRejectedValue(
        new Error('invalid input syntax for type uuid'),
      );
      const result = await service.getPedalById('not-a-uuid');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const existing = {
      id: 'pedal-1',
      brand: 'Big Muff',
      name: 'Pi',
      slug: 'big-muff-pi',
      comments: 'original',
      yearsManufactured: [new Date('1969-01-01T00:00:00Z')],
    } as Pedal;

    it('returns null when the pedal does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.update('missing', {
        brand: 'X',
        name: 'Y',
      });
      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('keeps the slug when brand and name are unchanged', async () => {
      repo.findOne.mockResolvedValue({ ...existing } as Pedal);
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update('pedal-1', {
        brand: 'Big Muff',
        name: 'Pi',
        comments: 'updated',
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe('big-muff-pi');
      expect(arg.comments).toBe('updated');
    });

    it('regenerates the slug when brand changes', async () => {
      repo.findOne.mockResolvedValue({ ...existing } as Pedal);
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update('pedal-1', { brand: 'Boss', name: 'Pi' });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe('boss-pi');
    });

    it('regenerates the slug when name changes', async () => {
      repo.findOne.mockResolvedValue({ ...existing } as Pedal);
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update('pedal-1', { brand: 'Big Muff', name: 'Deluxe' });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe('big-muff-deluxe');
    });
  });

  describe('delete', () => {
    it('deletes by id and returns true', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });
      const result = await service.delete('abc');
      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith('abc');
    });

    it('returns false when nothing is deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });
      const result = await service.delete('missing');
      expect(result).toBe(false);
    });
  });
});
