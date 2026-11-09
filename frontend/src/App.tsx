import React from 'react';
import { SimpleStudio } from './components/simple-studio/SimpleStudio';

export const App: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-charcoal-500 text-white">
      <SimpleStudio />
    </div>
  );
};

export default App;
