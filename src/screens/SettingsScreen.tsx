import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSimpleAuth } from '../services/simpleAuth';

const SettingsScreen = ({ navigation }: any) => {
  const { user, signOut } = useSimpleAuth();

  const handleSignOut = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل تريد تسجيل الخروج من التطبيق؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'الملف الشخصي',
      icon: 'person-outline',
      onPress: () => {
        Alert.alert('قريباً', 'هذه الميزة ستكون متاحة قريباً');
      }
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: 'notifications-outline',
      onPress: () => {
        Alert.alert('قريباً', 'إعدادات الإشعارات ستكون متاحة قريباً');
      }
    },
    {
      id: 'privacy',
      title: 'الخصوصية والأمان',
      icon: 'shield-outline',
      onPress: () => {
        Alert.alert('قريباً', 'إعدادات الخصوصية ستكون متاحة قريباً');
      }
    },
    {
      id: 'theme',
      title: 'المظهر',
      icon: 'color-palette-outline',
      onPress: () => {
        Alert.alert('قريباً', 'إعدادات المظهر ستكون متاحة قريباً');
      }
    },
    {
      id: 'language',
      title: 'اللغة',
      icon: 'language-outline',
      onPress: () => {
        Alert.alert('اللغة', 'التطبيق يدعم العربية حالياً');
      }
    },
    {
      id: 'about',
      title: 'حول التطبيق',
      icon: 'information-circle-outline',
      onPress: () => {
        Alert.alert('حول التطبيق', 'تطبيق المحادثات - الإصدار 1.0.0');
      }
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الإعدادات</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color="#0ea5e9" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'مستخدم'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'البريد الإلكتروني'}</Text>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.settingItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Ionicons name={option.icon as any} size={24} color="#9ca3af" />
                <Text style={styles.settingTitle}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>الإصدار 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#374151',
    marginTop: 1,
    marginBottom: 20,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: 14,
  },
  settingsSection: {
    backgroundColor: '#374151',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionSection: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  versionText: {
    color: '#6b7280',
    fontSize: 14,
  },
});

export default SettingsScreen;
