import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LifestyleSectionProps {
  data: any;
  updateData: (data: any) => void;
}

const ACTIVITY_LEVELS = [
  { key: 'Sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
  { key: 'Light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
  { key: 'Moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
  { key: 'Very Active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
];

const STEPS_OPTIONS = [
  { key: '<3k', label: 'Less than 3,000', icon: 'walk' },
  { key: '3-6k', label: '3,000 - 6,000', icon: 'walk' },
  { key: '6-10k', label: '6,000 - 10,000', icon: 'walk' },
  { key: '10k+', label: 'More than 10,000', icon: 'walk' },
];

const EXERCISE_FREQUENCY = [
  { key: 'None', label: 'None', desc: 'No regular exercise' },
  { key: '1-2', label: '1-2 times/week', desc: 'Occasional workouts' },
  { key: '3-4', label: '3-4 times/week', desc: 'Regular routine' },
  { key: '5+', label: '5+ times/week', desc: 'Very committed' },
];

const SLEEP_OPTIONS = [
  { key: '<5h', label: 'Less than 5 hours', icon: 'moon' },
  { key: '5-7h', label: '5-7 hours', icon: 'moon' },
  { key: '7-9h', label: '7-9 hours', icon: 'moon' },
  { key: '9+', label: 'More than 9 hours', icon: 'moon' },
];

const WATER_OPTIONS = [
  { key: '<1L', label: 'Less than 1L', icon: 'water' },
  { key: '1-2L', label: '1-2 liters', icon: 'water' },
  { key: '2-3L', label: '2-3 liters', icon: 'water' },
  { key: '3L+', label: 'More than 3L', icon: 'water' },
];

export default function LifestyleSection({ data, updateData }: LifestyleSectionProps) {
  const renderOptionCard = (
    options: any[],
    selectedValue: string,
    onSelect: (value: string) => void,
    showDescription = false
  ) => {
    return (
      <View style={styles.optionGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionCard,
              selectedValue === option.key && styles.optionCardSelected,
            ]}
            onPress={() => onSelect(option.key)}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={24}
                color={selectedValue === option.key ? '#007AFF' : '#666666'}
                style={styles.optionIcon}
              />
            )}
            <Text
              style={[
                styles.optionLabel,
                selectedValue === option.key && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            {showDescription && option.desc && (
              <Text
                style={[
                  styles.optionDesc,
                  selectedValue === option.key && styles.optionDescSelected,
                ]}
              >
                {option.desc}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Lifestyle</Text>
        <Text style={styles.sectionSubtitle}>
          Help us understand your daily activity patterns
        </Text>

        {/* Activity Level */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Daily Activity Level</Text>
          {renderOptionCard(
            ACTIVITY_LEVELS,
            data.activityLevel,
            (value) => updateData({ activityLevel: value }),
            true
          )}
        </View>

        {/* Steps Per Day */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Average Steps Per Day</Text>
          {renderOptionCard(
            STEPS_OPTIONS,
            data.stepsPerDay,
            (value) => updateData({ stepsPerDay: value })
          )}
        </View>

        {/* Exercise Frequency */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Weekly Exercise Frequency</Text>
          {renderOptionCard(
            EXERCISE_FREQUENCY,
            data.exerciseFrequency,
            (value) => updateData({ exerciseFrequency: value }),
            true
          )}
        </View>

        {/* Sleep Hours */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Sleep Per Night</Text>
          {renderOptionCard(
            SLEEP_OPTIONS,
            data.sleepHours,
            (value) => updateData({ sleepHours: value })
          )}
        </View>

        {/* Water Intake */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Daily Water Intake</Text>
          {renderOptionCard(
            WATER_OPTIONS,
            data.waterIntake,
            (value) => updateData({ waterIntake: value })
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 32,
  },
  questionGroup: {
    marginBottom: 32,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  optionGrid: {
    marginHorizontal: -6,
  },
  optionCard: {
    marginHorizontal: 6,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionIcon: {
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  optionDesc: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  optionDescSelected: {
    color: '#007AFF',
  },
});