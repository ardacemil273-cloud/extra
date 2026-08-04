import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = [
    { key: 'first_game', name: 'İlk Oyun', description: 'İlk oyununu oynadın!', icon: '🎮', xpReward: 50, rarity: 'common' },
    { key: 'first_win', name: 'İlk Zafer', description: 'İlk oyununu kazandın!', icon: '🏆', xpReward: 100, rarity: 'common' },
    { key: 'vampire_survivor', name: 'Vampir Avcısı', description: 'Vampir Köylü oyununda köylü olarak hayatta kal.', icon: '🧛', xpReward: 150, rarity: 'rare' },
    { key: 'vampire_master', name: 'Vampir Ustası', description: 'Vampir olarak tüm köylüleri ortadan kaldır.', icon: '🦇', xpReward: 200, rarity: 'epic' },
    { key: 'social_butterfly', name: 'Sosyal Kelebek', description: '5 arkadaş ekle.', icon: '🦋', xpReward: 75, rarity: 'common' },
    { key: 'veteran', name: 'Veteran', description: '100 oyun oyna.', icon: '⚔️', xpReward: 500, rarity: 'epic' },
    { key: 'detective_master', name: 'Dedektif', description: 'Dedektif olarak vampiri doğru tespit et.', icon: '🔍', xpReward: 175, rarity: 'rare' },
    { key: 'healer', name: 'Şifacı', description: 'Doktor olarak vampirin kurbanını kurtar.', icon: '💉', xpReward: 150, rarity: 'rare' },
    { key: 'legend', name: 'Efsane', description: 'Level 50\'ye ulaş.', icon: '👑', xpReward: 1000, rarity: 'legendary' },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { key: ach.key },
      update: ach,
      create: ach,
    });
  }

  console.log('✅ Seed tamamlandı: Başarımlar eklendi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
