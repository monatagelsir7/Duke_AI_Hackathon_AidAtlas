import PreferenceQuiz from '../PreferenceQuiz';

export default function PreferenceQuizExample() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PreferenceQuiz
        onComplete={(preferences) => {
          console.log('Quiz completed with preferences:', preferences);
        }}
      />
    </div>
  );
}
