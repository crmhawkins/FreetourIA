import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

function createDto(partial: Partial<CreateUserDto>): CreateUserDto {
  return plainToInstance(CreateUserDto, partial);
}

describe('CreateUserDto', () => {
  describe('email validation', () => {
    it('should pass with a valid email', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: 'secure123',
      });

      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');

      expect(emailErrors).toHaveLength(0);
    });

    it('should fail when email is missing', async () => {
      const dto = createDto({ password: 'secure123' });

      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');

      expect(emailErrors.length).toBeGreaterThan(0);
      expect(emailErrors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail when email is not a valid email format', async () => {
      const dto = createDto({
        email: 'not-an-email',
        password: 'secure123',
      });

      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');

      expect(emailErrors.length).toBeGreaterThan(0);
      expect(emailErrors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail when email is an empty string', async () => {
      const dto = createDto({ email: '', password: 'secure123' });

      const errors = await validate(dto);
      const emailErrors = errors.filter((e) => e.property === 'email');

      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe('password validation', () => {
    it('should pass with a password of 6 or more characters', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: '123456',
      });

      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'password');

      expect(pwErrors).toHaveLength(0);
    });

    it('should fail when password is shorter than 6 characters', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: '12345',
      });

      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'password');

      expect(pwErrors.length).toBeGreaterThan(0);
      expect(pwErrors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail when password is missing', async () => {
      const dto = createDto({ email: 'user@example.com' });

      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'password');

      expect(pwErrors.length).toBeGreaterThan(0);
    });

    it('should fail when password is an empty string', async () => {
      const dto = createDto({ email: 'user@example.com', password: '' });

      const errors = await validate(dto);
      const pwErrors = errors.filter((e) => e.property === 'password');

      expect(pwErrors.length).toBeGreaterThan(0);
    });
  });

  describe('name validation', () => {
    it('should pass when name is provided', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: 'secure123',
        name: 'John Doe',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass when name is omitted (optional)', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: 'secure123',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail when name is not a string', async () => {
      const dto = createDto({
        email: 'user@example.com',
        password: 'secure123',
        name: 12345 as any,
      });

      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'name');

      expect(nameErrors.length).toBeGreaterThan(0);
      expect(nameErrors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('full valid DTO', () => {
    it('should pass validation with all fields provided', async () => {
      const dto = createDto({
        email: 'test@example.com',
        password: 'mypassword',
        name: 'Test User',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only required fields', async () => {
      const dto = createDto({
        email: 'test@example.com',
        password: 'mypassword',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
