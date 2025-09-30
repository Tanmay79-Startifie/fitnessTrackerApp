import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BasicInfoSectionProps {
  data: any;
  updateData: (data: any) => void;
}

const AGE_GROUPS = ['18-25', '26-35', '36-45', '46+'];
const GENDERS = ['Male', 'Female', 'Other'];

export default function BasicInfoSection({ data, updateData }: BasicInfoSectionProps) {
  const [isMetric, setIsMetric] = useState(true);

  const handleHeightChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (isMetric) {
      updateData({ heightCm: numValue });
    } else {
      // Convert feet.inches to cm
      const feet = Math.floor(numValue);
      const inches = (numValue - feet) * 12;
      const totalInches = feet * 12 + inches;
      const cm = totalInches * 2.54;
      updateData({ heightCm: cm });
    }
  };

  const handleWeightChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (isMetric) {
      updateData({ weightKg: numValue });
    } else {
      // Convert lbs to kg
      const kg = numValue * 0.453592;
      updateData({ weightKg: kg });
    }
  };

  const getDisplayHeight = () => {
    if (isMetric) {
      return data.heightCm ? data.heightCm.toString() : '';
    } else {
      if (!data.heightCm) return '';
      const totalInches = data.heightCm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}.${inches.toString().padStart(2, '0')}`;
    }
  };

  const getDisplayWeight = () => {
    if (isMetric) {
      return data.weightKg ? data.weightKg.toString() : '';
    } else {
      if (!data.weightKg) return '';
      const lbs = Math.round(data.weightKg / 0.453592);
      return lbs.toString();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tell us about yourself</Text>
        <Text style={styles.sectionSubtitle}>
          This helps us create a personalized fitness plan just for you
        </Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={data.fullName}
            onChangeText={(value) => updateData({ fullName: value })}
            placeholder="Enter your full name"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Age Group */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age Group</Text>
          <View style={styles.optionGrid}>
            {AGE_GROUPS.map((ageGroup) => (
              <TouchableOpacity
                key={ageGroup}
                style={[
                  styles.optionButton,
                  data.ageGroup === ageGroup && styles.optionButtonSelected,
                ]}
                onPress={() => updateData({ ageGroup })}
              >
                <Text
                  style={[
                    styles.optionText,
                    data.ageGroup === ageGroup && styles.optionTextSelected,
                  ]}
                >
                  {ageGroup}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionGrid}>
            {GENDERS.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  data.gender === gender && styles.optionButtonSelected,
                ]}
                onPress={() => updateData({ gender })}
              >
                <Text
                  style={[
                    styles.optionText,
                    data.gender === gender && styles.optionTextSelected,
                  ]}
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Units Toggle */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Measurement Units</Text>
          <View style={styles.unitsToggle}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                isMetric && styles.unitButtonSelected,
              ]}
              onPress={() => setIsMetric(true)}
            >
              <Text
                style={[
                  styles.unitText,
                  isMetric && styles.unitTextSelected,
                ]}
              >
                Metric
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                !isMetric && styles.unitButtonSelected,
              ]}
              onPress={() => setIsMetric(false)}
            >
              <Text
                style={[
                  styles.unitText,
                  !isMetric && styles.unitTextSelected,
                ]}
              >
                Imperial
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Height */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Height {isMetric ? '(cm)' : '(ft.in)'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={getDisplayHeight()}
            onChangeText={handleHeightChange}
            placeholder={isMetric ? 'Enter height in cm' : 'Enter height as ft.in (e.g., 5.10)'}
            placeholderTextColor="#999999"
            keyboardType="numeric"
          />
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Weight {isMetric ? '(kg)' : '(lbs)'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={getDisplayWeight()}
            onChangeText={handleWeightChange}
            placeholder={isMetric ? 'Enter weight in kg' : 'Enter weight in lbs'}
            placeholderTextColor="#999999"
            keyboardType="numeric"
          />
        </View>

        {/* BMI Display */}
        {data.heightCm > 0 && data.weightKg > 0 && (
          <View style={styles.bmiContainer}>
            <Ionicons name="calculator" size={16} color="#007AFF" />
            <Text style={styles.bmiText}>
              Your BMI: {((data.weightKg / ((data.heightCm / 100) ** 2))).toFixed(1)}
            </Text>
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    marginHorizontal: 6,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 14,
    color: '#666666',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  unitsToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitButtonSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitText: {
    fontSize: 14,
    color: '#666666',
  },
  unitTextSelected: {
    color: '#333333',
    fontWeight: '600',
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  bmiText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
});