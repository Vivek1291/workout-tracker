import React from 'react';
import { Image, View } from 'react-native';
import { Exercise } from '../types';
import { MuscleMap } from './MuscleMap';
import { colors } from './theme';

/** The exercise's picture: the uploaded photo when chosen, otherwise the muscle diagram. */
export function ExerciseImage({ exercise, size = 56, legend }: { exercise: Exercise | undefined; size?: number; legend?: boolean }) {
  if (exercise?.picture === 'photo' && exercise.imageUri) {
    return (
      <View style={{ width: size * 0.91, height: size, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.border }}>
        <Image
          source={{ uri: exercise.imageUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${exercise.name}`}
        />
      </View>
    );
  }
  return <MuscleMap exercise={exercise} size={size} legend={legend} />;
}
