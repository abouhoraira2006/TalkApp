import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleAuth } from '../services/simpleAuth';
import { db } from '../config/firebase';

interface SimpleLoginScreenProps {
  onLoginSuccess: () => void;
}

export const SimpleLoginScreen = ({ onLoginSuccess }: SimpleLoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const { signIn, signUp } = useSimpleAuth();

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length === 0) {
      setUsernameError('');
      return;
    }

    if (usernameToCheck.length < 3) {
      setUsernameError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    setCheckingUsername(true);
    setUsernameError(''); // Clear any previous errors
    
    try {
      const snapshot = await db.collection('users').where('username', '==', usernameToCheck.toLowerCase()).get();
      if (!snapshot.empty) {
        setUsernameError('اسم المستخدم مستخدم بالفعل');
      } else {
        // Username is available - no error message
        setUsernameError('');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('خطأ في التحقق من اسم المستخدم');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    const cleanText = text.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(cleanText);
    
    // Clear previous error first
    setUsernameError('');
    
    if (cleanText.length === 0) {
      return;
    }
    
    if (cleanText.length < 3) {
      setUsernameError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    
    // Debounce username check for valid length usernames
    const timeoutId = setTimeout(() => {
      // Check if the text is still the same after delay
      setUsername(current => {
        if (current === cleanText && cleanText.length >= 3) {
          checkUsernameAvailability(cleanText);
        }
        return current;
      });
    }, 500);
  };

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && (!name || !username))) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    if (isSignUp && usernameError) {
      Alert.alert('خطأ', 'يرجى إصلاح أخطاء اسم المستخدم');
      return;
    }

    setLoading(true);
    
    try {
      let result;
      if (isSignUp) {
        // Check username one more time before signup
        await checkUsernameAvailability(username);
        if (usernameError) {
          Alert.alert('خطأ', 'اسم المستخدم غير متاح');
          setLoading(false);
          return;
        }
        result = await signUp(email, password, name, username.toLowerCase());
      } else {
        result = await signIn(email, password);
      }

      if (result.success) {
        onLoginSuccess();
      } else {
        Alert.alert('خطأ', result.error || 'حدث خطأ');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#0ea5e9', '#3b82f6', '#6366f1']}
                style={styles.logoGradient}
              >
                <Ionicons name="chatbubbles" size={48} color="#ffffff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>TalkApp</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'إنشاء حساب جديد' : 'مرحباً بك مرة أخرى'}
            </Text>
            <Text style={styles.description}>
              {isSignUp 
                ? 'انضم إلى مجتمعنا وابدأ المحادثة' 
                : 'سجل دخولك للمتابعة'
              }
            </Text>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="اسم العرض (مثال: أحمد محمد)"
                    placeholderTextColor="#64748b"
                    value={name}
                    onChangeText={setName}
                    textAlign="right"
                  />
                </View>
                
                <View style={[styles.inputContainer, usernameError ? styles.inputError : username && !usernameError && !checkingUsername ? styles.inputSuccess : null]}>
                  <View style={styles.usernameValidation}>
                    {checkingUsername ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : username && !usernameError ? (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    ) : usernameError ? (
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    ) : (
                      <Ionicons name="at" size={20} color="#64748b" />
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="اسم المستخدم (مثال: ahmed_123)"
                    placeholderTextColor="#64748b"
                    value={username}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    textAlign="right"
                  />
                </View>
                
                {usernameError ? (
                  <Text style={styles.errorText}>{usernameError}</Text>
                ) : username && !checkingUsername ? (
                  <Text style={styles.successText}>اسم المستخدم متاح ✓</Text>
                ) : null}
              </>
            )}
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.inputIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIconRight} />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#6b7280', '#6b7280'] : ['#0ea5e9', '#3b82f6']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
                    </Text>
                    <Ionicons 
                      name={isSignUp ? "person-add" : "log-in"} 
                      size={20} 
                      color="#ffffff" 
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchText}>
                {isSignUp ? 'لديك حساب؟ ' : 'ليس لديك حساب؟ '}
              </Text>
              <Text style={styles.switchTextBold}>
                {isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'right',
  },
  inputIcon: {
    marginRight: 12,
    padding: 4,
  },
  inputIconRight: {
    marginLeft: 12,
  },
  button: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  switchTextBold: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  inputSuccess: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  usernameValidation: {
    marginRight: 12,
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: -15,
    marginBottom: 15,
    marginLeft: 16,
    textAlign: 'right',
  },
  successText: {
    color: '#10b981',
    fontSize: 14,
    marginTop: -15,
    marginBottom: 15,
    marginLeft: 16,
    textAlign: 'right',
  },
});
