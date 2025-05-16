import React, { useState } from 'react';

interface ExamAnswerImageProps {
  imageUrl: string;
  altText?: string;
  className?: string;
}

const ExamAnswerImage: React.FC<ExamAnswerImageProps> = ({ 
  imageUrl, 
  altText = "Answer image",
  className = "max-h-48 object-contain rounded-md"
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!imageUrl) return null;

  return (
    <div 
      className="mt-2 flex justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`
        transition-all duration-300 ease-in-out
        ${isHovered ? 'transform scale-105 shadow-lg' : ''}
      `}>
        <img 
          src={imageUrl} 
          alt={altText}
          className={`${className} transition-transform duration-300`}
          onError={(e) => {
            console.error('Error loading image');
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export default ExamAnswerImage; 