
import { Course } from '../types';
import { MapPin, ArrowRight } from 'lucide-react';

interface CourseSelectionProps {
  courses: Course[];
  selectedCourse: Course | null;
  onCourseSelect: (course: Course) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CourseSelection({
  courses,
  selectedCourse,
  onCourseSelect,
  onNext,
  onBack
}: CourseSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Select Course
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Choose your golf course for today's round
          </p>

          <div className="space-y-4 mb-8">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => onCourseSelect(course)}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                  selectedCourse?.id === course.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {course.name}
                      </h3>
                      <p className="text-gray-600">
                        {course.holes.length} holes • Par {course.holes.reduce((sum, hole) => sum + hole.par, 0)}
                      </p>
                    </div>
                  </div>
                  {selectedCourse?.id === course.id && (
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onBack}
              className="flex-1 border border-gray-300 text-gray-700 py-4 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              disabled={!selectedCourse}
              className="flex-1 bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <span>Start Game</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}