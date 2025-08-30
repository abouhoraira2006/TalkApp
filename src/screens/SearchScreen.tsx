import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { SearchBar } from '../components/SearchBar';
import { getAllUsers } from '../services/firebase';
import { generateChatId } from '../utils/formatTime';

interface SearchScreenProps {
  currentUser: User;
  onUserSelect: (user: User) => void;
  onBack: () => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  currentUser,
  onUserSelect,
  onBack,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.id !== currentUser.id &&
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users.filter(user => user.id !== currentUser.id));
    }
  }, [searchQuery, users, currentUser.id]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    onUserSelect(user);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const getStatusText = () => {
      if (item.online) {
        return 'Online';
      }
      return 'Offline';
    };

    const getStatusColor = () => {
      if (item.online) {
        return '#10b981';
      }
      return '#9ca3af';
    };

    return (
      <TouchableOpacity
        onPress={() => handleUserSelect(item)}
        className="flex-row items-center px-4 py-3 border-b border-gray-700"
      >
        <View className="relative">
          <Image
            source={{ uri: item.photoUrl }}
            className="w-12 h-12 rounded-full"
          />
          <View
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900"
            style={{ backgroundColor: getStatusColor() }}
          />
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-white font-semibold text-base">
            {item.name}
          </Text>
          <Text className="text-gray-400 text-sm">
            {item.email}
          </Text>
          <View className="flex-row items-center mt-1">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: getStatusColor() }}
            />
            <Text className="text-gray-500 text-xs">
              {getStatusText()}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
        <TouchableOpacity onPress={onBack} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-semibold text-lg">New Chat</Text>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name or email..."
        onClear={() => setSearchQuery('')}
      />

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Ionicons name="people-outline" size={64} color="#6b7280" />
            <Text className="text-gray-400 text-lg mt-4 text-center">
              {searchQuery ? 'No users found' : 'No users available'}
            </Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              {searchQuery ? 'Try a different search term' : 'Other users will appear here when they join'}
            </Text>
          </View>
        }
      />
    </View>
  );
};
