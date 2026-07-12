import type { Course, Lesson } from "@deutschtrainer/shared-types";

export interface CourseRepository {
  listPublishedCourses(): Promise<Course[]>;
  getPublishedCourse(courseId: string): Promise<Course | null>;
}

export interface LessonRepository {
  getPublishedLesson(lessonId: string): Promise<Lesson | null>;
}

export interface RepositoryContext {
  requestId: string;
  userId?: string;
}
