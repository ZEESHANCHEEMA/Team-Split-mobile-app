import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { createTeam, getTeamsForUser, CURRENCY } from '../services/firestore';
import type { Team } from '../types/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

type CreateTeamNav = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'CreateTeam'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const CreateTeamScreen: React.FC = () => {
  const navigation = useNavigation<CreateTeamNav>();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setTeams([]);
      setListLoading(false);
      return;
    }
    try {
      const data = await getTeamsForUser(uid);
      setTeams(data);
    } catch {
      setTeams([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setListLoading(true);
      loadTeams();
    }, [loadTeams])
  );

  const handleTeamPress = (teamId: string) => {
    navigation.navigate('TeamDetail', { teamId });
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a team name');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError('Not signed in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createTeam(trimmed, [uid]);
      setName('');
      setError(null);
      // refresh list so the new team appears
      loadTeams();
    } catch {
      setError('Could not create team. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create team</Text>
      <Text style={styles.subtitle}>Add a name. You can add members later.</Text>

      <TextInput
        style={styles.input}
        placeholder="Team name"
        placeholderTextColor="#6b7280"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        editable={!loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <>
            <Ionicons name="people" size={20} color="#020617" />
            <Text style={styles.buttonText}>Create team</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your teams</Text>
      </View>

      {listLoading ? (
        <View style={styles.listLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No teams yet. Create your first team above.</Text>
          }
          renderItem={({ item }) => {
            const memberCount =
              (item.memberIds?.length || 0) + (item.guestMembers?.length || 0);
            return (
              <TouchableOpacity
                style={styles.teamRow}
                activeOpacity={0.7}
                onPress={() => handleTeamPress(item.id)}
              >
                <View style={styles.teamLeft}>
                  <View style={styles.teamAvatar}>
                    <Text style={styles.teamAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.teamName}>{item.name}</Text>
                    <Text style={styles.teamSubtitle}>
                      Created group · {memberCount} member
                      {memberCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryTextOnPrimary,
  },
  listHeader: {
    marginTop: 24,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listLoading: {
    paddingVertical: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  teamSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 4,
  },
});

export default CreateTeamScreen;
