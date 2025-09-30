import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NutritionSectionProps {
  data: any;
  updateData: (data: any) => void;
}

const DIET_TYPES = [
  { key: 'Balanced', label: 'Balanced Diet', icon: 'leaf', desc: 'Mix of all food groups' },
  { key: 'Vegetarian', label: 'Vegetarian', icon: 'leaf', desc: 'Plant-based foods only' },
  { key: 'Non-veg', label: 'Non-Vegetarian', icon: 'restaurant', desc: 'Includes meat & seafood' },
  { key: 'High protein', label: 'High Protein', icon: 'fitness', desc: 'Protein-focused meals' },
  { key: 'High junk', label: 'Convenience Foods', icon: 'fast-food', desc: 'Quick & processed foods' },
];

const FRUITS_VEG_FREQUENCY = [
  { key: 'Rarely', label: 'Rarely', icon: 'close-circle', desc: 'Less than once a week' },
  { key: 'Sometimes', label: 'Sometimes', icon: 'checkmark-circle', desc: '2-4 times per week' },
  { key: 'Daily', label: 'Daily', icon: 'checkmark-done-circle', desc: 'Every day' },
];

const SMOKING_ALCOHOL = [
  { key: 'No', label: 'No', icon: 'checkmark-circle', desc: 'I don\'t smoke or drink' },
  { key: 'Occasionally', label: 'Occasionally', icon: 'time', desc: 'Social occasions only' },
  { key: 'Yes', label: 'Regularly', icon: 'warning', desc: 'Regular consumption' },
];

const STRESS_LEVELS = [
  { key: 'Low', label: 'Low Stress', icon: 'happy', desc: 'Generally calm and relaxed' },
  { key: 'Moderate', label: 'Moderate Stress', icon: 'sad', desc: 'Some work/life pressure' },
  { key: 'High', label: 'High Stress', icon: 'skull', desc: 'Frequent stress and pressure' },
];

const ALLERGENS = [
  { key: 'dairy', label: 'Dairy', icon: 'nutrition' },
  { key: 'gluten', label: 'Gluten', icon: 'leaf' },
  { key: 'peanut', label: 'Peanuts', icon: 'warning' },
  { key: 'shellfish', label: 'Shellfish', icon: 'fish' },
  { key: 'eggs', label: 'Eggs', icon: 'ellipse' },
  { key: 'soy', label: 'Soy', icon: 'leaf' },
];

const CUISINE_PREFERENCES = [
  { key: 'Indian', label: 'Indian', icon: 'restaurant' },
  { key: 'Continental', label: 'Continental', icon: 'wine' },
  { key: 'Mixed', label: 'Mixed Cuisine', icon: 'globe' },
];

export default function NutritionSection({ data, updateData }: NutritionSectionProps) {
  const toggleAllergy = (allergy: string) => {
    const currentAllergies = data.allergies || [];
    if (currentAllergies.includes(allergy)) {
      updateData({ allergies: currentAllergies.filter((a: string) => a !== allergy) });
    } else {
      updateData({ allergies: [...currentAllergies, allergy] });
    }
  };

  const renderOptionCards = (
    options: any[],
    selectedValue: string,
    onSelect: (value: string) => void,
    showDescription = true
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
              size={28}
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

  const renderAllergenOptions = () => {
    const currentAllergies = data.allergies || [];
    return (
      <View style={styles.allergenGrid}>
        {ALLERGENS.map((allergen) => (
          <TouchableOpacity
            key={allergen.key}
            style={[
              styles.allergenButton,
              currentAllergies.includes(allergen.key) && styles.allergenButtonSelected,
            ]}
            onPress={() => toggleAllergy(allergen.key)}
          >
            <Ionicons
              name={allergen.icon}
              size={20}
              color={currentAllergies.includes(allergen.key) ? '#ffffff' : '#666666'}
              style={styles.allergenIcon}
            />
            <Text
              style={[
                styles.allergenText,
                currentAllergies.includes(allergen.key) && styles.allergenTextSelected,
              ]}
            >
              {allergen.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.allergenButton,
            currentAllergies.length === 0 && styles.allergenButtonSelected,
          ]}
          onPress={() => updateData({ allergies: [] })}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={currentAllergies.length === 0 ? '#ffffff' : '#666666'}
            style={styles.allergenIcon}
          />
          <Text
            style={[
              styles.allergenText,
              currentAllergies.length === 0 && styles.allergenTextSelected,
            ]}
          >
            None
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition & Habits</Text>
        <Text style={styles.sectionSubtitle}>
          Tell us about your eating habits and lifestyle choices
        </Text>

        {/* Diet Type */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>What's your diet type?</Text>
          {renderOptionCards(
            DIET_TYPES,
            data.dietType,
            (value) => updateData({ dietType: value })
          )}
        </View>

        {/* Fruits & Vegetables */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>How often do you eat fruits & vegetables?</Text>
          {renderOptionCards(
            FRUITS_VEG_FREQUENCY,
            data.fruitsVegetables,
            (value) => updateData({ fruitsVegetables: value })
          )}
        </View>

        {/* Smoking & Alcohol */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Do you smoke or drink alcohol?</Text>
          {renderOptionCards(
            SMOKING_ALCOHOL,
            data.smokingAlcohol,
            (value) => updateData({ smokingAlcohol: value })
          )}
        </View>

        {/* Stress Level */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>What's your stress level?</Text>
          {renderOptionCards(
            STRESS_LEVELS,
            data.stressLevel,
            (value) => updateData({ stressLevel: value })
          )}
        </View>

        {/* Food Allergies */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Do you have any food allergies?</Text>
          <Text style={styles.questionSubtitle}>Select all that apply</Text>
          {renderAllergenOptions()}
        </View>

        {/* Cuisine Preference */}
        <View style={styles.questionGroup}>
          <Text style={styles.questionTitle}>Cuisine Preference</Text>
          {renderOptionCards(
            CUISINE_PREFERENCES,
            data.cuisinePreference,
            (value) => updateData({ cuisinePreference: value }),
            false
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
  questionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  optionGrid: {
    marginHorizontal: -6,
  },
  optionCard: {
    marginHorizontal: 6,
    marginVertical: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    minHeight: 120,
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
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  allergenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  allergenButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  allergenIcon: {
    marginRight: 6,
  },
  allergenText: {
    fontSize: 14,
    color: '#666666',
  },
  allergenTextSelected: {
    color: '#ffffff',
  },
});