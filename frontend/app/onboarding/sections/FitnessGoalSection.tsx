import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FitnessGoalSectionProps {
  data: any;
  updateData: (data: any) => void;
}

const FITNESS_GOALS = [
  { key: 'Lose weight', label: 'Lose Weight', icon: 'trending-down', desc: 'Reduce body fat & weight' },
  { key: 'Gain muscle', label: 'Gain Muscle', icon: 'fitness', desc: 'Build strength & muscle mass' },
  { key: 'Maintain', label: 'Maintain Weight', icon: 'checkmark-circle', desc: 'Stay at current weight' },
  { key: 'Improve stamina', label: 'Improve Stamina', icon: 'flash', desc: 'Boost cardiovascular fitness' },
];

const EQUIPMENT_ACCESS = [
  { key: 'None', label: 'No Equipment', icon: 'home', desc: 'Bodyweight exercises only' },
  { key: 'Bands', label: 'Resistance Bands', icon: 'link', desc: 'Bands & light equipment' },
  { key: 'Dumbbells', label: 'Dumbbells', icon: 'barbell', desc: 'Basic weights at home' },
  { key: 'Full gym', label: 'Full Gym', icon: 'business', desc: 'Complete gym access' },
];

const WORKOUT_TIMES = [
  { key: 'morning', label: 'Morning', icon: 'sunny', desc: '6:00 - 10:00 AM' },
  { key: 'lunch', label: 'Lunch Time', icon: 'partly-sunny', desc: '12:00 - 2:00 PM' },
  { key: 'evening', label: 'Evening', icon: 'moon', desc: '5:00 - 8:00 PM' },
];

const WEEKDAYS = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
];

export default function FitnessGoalSection({ data, updateData }: FitnessGoalSectionProps) {
  const toggleTrainingDay = (day: string) => {
    const currentDays = data.trainingDays || [];
    if (currentDays.includes(day)) {
      updateData({ trainingDays: currentDays.filter((d: string) => d !== day) });
    } else {
      updateData({ trainingDays: [...currentDays, day] });
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Format HH:MM
    const cleaned = time.replace(/[^\d]/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleTimeChange = (field: string, value: string) => {
    const formatted = formatTime(value);
    updateData({ [field]: formatted });
  };

  const renderOptionCards = (
    options: any[],
    selectedValue: string,
    onSelect: (value: string) => void
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
            <Ionicons
              name={option.icon}
              size={32}
              color={selectedValue === option.key ? '#007AFF' : '#666666'}
              style={styles.optionIcon}
            />
            <Text
              style={[
                styles.optionLabel,
                selectedValue === option.key && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.optionDesc,
                selectedValue === option.key && styles.optionDescSelected,
              ]}
            >
              {option.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fitness Goals</Text>
        <Text style={styles.sectionSubtitle}>
          Let's set up your personalized fitness plan
        </Text>

        {/* Primary Goal */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>What's your primary fitness goal?</Text>
          {renderOptionCards(
            FITNESS_GOALS,
            data.primaryGoal,
            (value) => updateData({ primaryGoal: value })
          )}
        </View>

        {/* Equipment Access */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>What equipment do you have access to?</Text>
          {renderOptionCards(
            EQUIPMENT_ACCESS,
            data.equipmentAccess,
            (value) => updateData({ equipmentAccess: value })
          )}
        </View>

        {/* Workout Time */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>When do you prefer to workout?</Text>
          {renderOptionCards(
            WORKOUT_TIMES,
            data.preferredWorkoutTime,
            (value) => updateData({ preferredWorkoutTime: value })
          )}
        </View>

        {/* Sleep Schedule */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Sleep Schedule</Text>
          <View style={styles.timeInputContainer}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Wake up time</Text>
              <TextInput
                style={styles.timeInput}
                value={data.wakeTime}
                onChangeText={(value) => handleTimeChange('wakeTime', value)}
                placeholder="07:00"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Bed time</Text>
              <TextInput
                style={styles.timeInput}
                value={data.bedTime}
                onChangeText={(value) => handleTimeChange('bedTime', value)}
                placeholder="22:00"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Training Days */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Which days will you train?</Text>
          <Text style={styles.questionSubtitle}>Select your preferred workout days</Text>
          <View style={styles.weekdayContainer}>
            {WEEKDAYS.map((day) => {
              const isSelected = (data.trainingDays || []).includes(day.key);
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.weekdayButton,
                    isSelected && styles.weekdayButtonSelected,
                  ]}
                  onPress={() => toggleTrainingDay(day.key)}
                >
                  <Text
                    style={[
                      styles.weekdayText,
                      isSelected && styles.weekdayTextSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.selectedDaysText}>
            {(data.trainingDays || []).length} days selected
          </Text>
        </View>

        {/* Summary */}
        {data.primaryGoal && data.equipmentAccess && (
          <View style={styles.summaryContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Your Plan Preview</Text>
              <Text style={styles.summaryText}>
                {data.primaryGoal} with {data.equipmentAccess.toLowerCase()} equipment
              </Text>
              <Text style={styles.summaryText}>
                {data.preferredWorkoutTime} workouts, {(data.trainingDays || []).length} days/week
              </Text>
            </View>
          </View>
        )}
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
  questionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionCard: {
    width: '47%',
    marginHorizontal: '1.5%',
    marginVertical: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 6,
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  optionDesc: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  optionDescSelected: {
    color: '#007AFF',
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  timeInputGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  timeInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  weekdayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  weekdayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 6,
  },
  weekdayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  weekdayTextSelected: {
    color: '#ffffff',
  },
  selectedDaysText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fff8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f5e8',
    alignItems: 'flex-start',
  },
  summaryContent: {
    flex: 1,
    marginLeft: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
});