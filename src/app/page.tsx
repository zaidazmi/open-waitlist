import WaitlistHero from '@/components/WaitlistHero';

type HomePageProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const referralCode = params.ref || null;

  return (
    <main>
      <WaitlistHero referralCode={referralCode} />
    </main>
  );
}
