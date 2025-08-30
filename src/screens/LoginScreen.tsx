import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmailAuth } from '../services/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const { user, loading, signIn, signUp, resetPassword, checkUsernameAvailability, validateUsername } = useEmailAuth();

  const handleUsernameChange = async (text: string) => {
    setUsername(text);
    
    if (!text.trim()) {
      setUsernameStatus('idle');
      return;
    }

    const validation = validateUsername(text);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const isAvailable = await checkUsernameAvailability(validation.cleanUsername);
    setUsernameStatus(isAvailable ? 'available' : 'taken');
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case 'available': return '#10b981';
      case 'taken': return '#ef4444';
      case 'invalid': return '#ef4444';
      case 'checking': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getUsernameStatusText = () => {
    switch (usernameStatus) {
      case 'available': return '✓ متاح';
      case 'taken': return '✗ غير متاح';
      case 'invalid': return '✗ غير صالح';
      case 'checking': return 'جاري التحقق...';
      default: return '';
    }
  };

  React.useEffect(() => {
    if (user) {
      onLoginSuccess(user);
    }
  }, [user, onLoginSuccess]);

  const handleSubmit = async () => {
    // Trim inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    
    if (!trimmedEmail || !password) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!isLogin) {
      if (!trimmedName) {
        Alert.alert('خطأ', 'يرجى إدخال الاسم');
        return;
      }
      if (!username.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال اسم المستخدم');
        return;
      }
      if (usernameStatus !== 'available') {
        Alert.alert('خطأ', 'يرجى اختيار اسم مستخدم صالح ومتاح');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('خطأ', 'كلمات المرور غير متطابقة');
        return;
      }
      if (password.length < 6) {
        Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }
    }

    const result = isLogin ? await signIn(trimmedEmail, password) : await signUp(trimmedEmail, password, trimmedName, username);

    if (!result.success) {
      Alert.alert('خطأ', result.error || 'حدث خطأ غير متوقع');
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني أولاً');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('خطأ', 'تنسيق البريد الإلكتروني غير صحيح');
      return;
    }

    const result = await resetPassword(trimmedEmail);
    if (result.success) {
      Alert.alert('تم الإرسال', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } else {
      Alert.alert('خطأ', result.error || 'فشل في إرسال رابط إعادة التعيين');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#1f2937' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{ 
            width: 96, 
            height: 96, 
            backgroundColor: '#0ea5e9', 
            borderRadius: 16, 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 24 
          }}>
            <Ionicons name="chatbubbles" size={48} color="white" />
          </View>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
            TalkApp
          </Text>
          <Text style={{ color: '#9ca3af', textAlign: 'center', fontSize: 18 }}>
            {isLogin ? 'مرحباً بك مرة أخرى' : 'إنشاء حساب جديد'}
          </Text>
        </View>

        {/* Form */}
        <View style={{ width: '100%', maxWidth: 400 }}>
          {!isLogin && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'white', marginBottom: 8, fontSize: 16 }}>الاسم</Text>
              <TextInput
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: '#4b5563',
                }}
                placeholder="الاسم الكامل"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {!isLogin && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'white', marginBottom: 8, fontSize: 16 }}>اسم المستخدم</Text>
              <TextInput
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  marginBottom: 8,
                  borderWidth: 2,
                  borderColor: getUsernameStatusColor(),
                }}
                placeholder="اسم المستخدم (أحرف وأرقام و _ فقط)"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameStatus !== 'idle' && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4,
                  paddingHorizontal: 4,
                }}>
                  {usernameStatus === 'checking' && (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  )}
                  <Text style={{
                    fontSize: 14,
                    marginLeft: 8,
                    fontWeight: '500',
                    color: getUsernameStatusColor(),
                  }}>
                    {getUsernameStatusText()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: 'white', marginBottom: 8, fontSize: 16 }}>البريد الإلكتروني</Text>
            <TextInput
              style={{
                backgroundColor: '#374151',
                color: 'white',
                padding: 16,
                borderRadius: 12,
                fontSize: 16,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#4b5563',
              }}
              placeholder="أدخل بريدك الإلكتروني"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: 'white', marginBottom: 8, fontSize: 16 }}>كلمة المرور</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  paddingRight: 50,
                }}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 16, top: 16 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'white', marginBottom: 8, fontSize: 16 }}>تأكيد كلمة المرور</Text>
              <TextInput
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                }}
                placeholder="أعد إدخال كلمة المرور"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
              />
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#6b7280' : '#0ea5e9',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Login/Register */}
          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={{ alignItems: 'center', marginBottom: 16 }}
          >
            <Text style={{ color: '#0ea5e9', fontSize: 16 }}>
              {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          {isLogin && (
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={{ alignItems: 'center' }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                نسيت كلمة المرور؟
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
