import { CreateUserDto } from '../dto/create-user.dto';

export const mockUser: CreateUserDto = {
  premium: true,
  active: true,
  verified: true,
  username: 'bernardo_dev',
  email: 'bernardo@example.com',
  password: 'securePass123',
  fullName: 'Bernardo Silva',
  phoneNumber: '+5531999999999',
  birthDate: new Date('1995-06-15'),
  location: {
    type: 'Point',
    coordinates: [-43.9352, -19.9208], // Exemplo de BH
  },
  profession: ['Software Engineer', 'Musician'],
  showMe: ['women', 'non-binary'],
  description: ['Amo tecnologia', 'Toco violão nas horas vagas'],
  photos: [
    {
      url: 'https://example.com/photo1.jpg',
      uploadDate: new Date(),
    },
    {
      url: 'https://example.com/photo2.jpg',
    },
  ],
  about: {
    height: 180,
    physicalExercise: 'Regularly',
    education: 'Bachelor in Computer Science',
    drinking: 'Socially',
    smoking: 'No',
    lookingFor: 'Relationship',
    children: 'No',
    zodiacSign: 'Gemini',
    politics: 'Left',
    religion: 'Buddhist',
  },
  languages: ['Portuguese', 'English', 'Italian'],
  conversations: ['661f5c947b7e6ed1a7fbc123', '661f5c947b7e6ed1a7fbc456'],
  connectedAccounts: ['spotify', 'instagram'],
  interests: ['Music', 'Tech', 'Cinema'],
  matches: ['661f5c947b7e6ed1a7fbc111'],
  likedProfiles: ['661f5c947b7e6ed1a7fbc222'],
  likedYouProfiles: ['661f5c947b7e6ed1a7fbc333'],
  preferences: {
    ageRange: [25, 35],
    distance: '50km',
    advancedFilters: {
      verified: true,
      height: [170, 190],
      education: ['Bachelor', 'Master'],
      alcohol: ['Socially'],
      smoking: ['No'],
      children: ['No'],
      zodiacSign: ['Libra', 'Gemini'],
      politicalView: ['Left'],
      religion: ['Buddhist', 'Spiritual'],
    },
  },
};
