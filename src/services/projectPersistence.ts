import { supabase } from '../supabaseClient';
import {
  LOCAL_STORAGE_KEY,
  useProjectStore
} from '../store/projectStore';
import { validateWorkspace } from '../validation/workspaceValidation';

import type {
  PersistedWorkspace
} from '../validation/workspaceValidation';

const normalizeWorkspace = (
  value: unknown
): PersistedWorkspace | null => {
  const result = validateWorkspace(value);

  return result.ok ? result.workspace : null;
};

const cloneWorkspace = (
  workspace: PersistedWorkspace
): PersistedWorkspace =>
  JSON.parse(JSON.stringify(workspace)) as PersistedWorkspace;

const saveLocalStorageBackup = (
  workspace: PersistedWorkspace
): void => {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(workspace)
    );
  } catch (error) {
    console.error('Local storage backup failed:', error);
  }
};

let persistencePromise: Promise<void> | null = null;
let stopPersistence: (() => void) | null = null;
let saveQueue: Promise<void> = Promise.resolve();
let currentProjectId: string | null = null;

const getCurrentWorkspace = (): PersistedWorkspace => {
  const state = useProjectStore.getState();

  return {
    scenarios: state.scenarios,
    activeScenarioId: state.activeScenarioId,
    baseScenarioId: state.baseScenarioId
  };
};

const subscribeToLocalPersistence = (): void => {
  stopPersistence?.();

  stopPersistence = useProjectStore.subscribe((state) => {
    saveLocalStorageBackup({
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      baseScenarioId: state.baseScenarioId
    });
  });
};

const subscribeToCloudPersistence = (): void => {
  stopPersistence?.();

  stopPersistence = useProjectStore.subscribe((state) => {
    const nextWorkspace = cloneWorkspace({
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      baseScenarioId: state.baseScenarioId
    });

    saveLocalStorageBackup(nextWorkspace);

    saveQueue = saveQueue
      .then(async () => {
        if (!currentProjectId) return;

        const { error } = await supabase
          .from('projects')
          .update({
            data: nextWorkspace,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentProjectId);

        if (error) {
          console.error(
            'Supabase workspace save failed:',
            error
          );
        }
      })
      .catch((error) => {
        console.error('Queue save failed:', error);
      });
  });
};

export const initializeProjectPersistence =
  (): Promise<void> => {
    if (persistencePromise) {
      return persistencePromise;
    }

    persistencePromise = (async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          'Could not verify the authenticated user:',
          userError
        );

        subscribeToLocalPersistence();
        return;
      }

      if (!user) {
        console.error(
          'No authenticated user found for persistence.'
        );

        subscribeToLocalPersistence();
        return;
      }

      try {
        const {
          data: existingProject,
          error: fetchError
        } = await supabase
          .from('projects')
          .select('id, data')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        let workspace: PersistedWorkspace;

        if (existingProject?.data) {
          currentProjectId = existingProject.id;

          workspace =
            normalizeWorkspace(existingProject.data) ??
            getCurrentWorkspace();
        } else {
          workspace = getCurrentWorkspace();

          const {
            data: newProject,
            error: insertError
          } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: 'My Workspace',
              data: cloneWorkspace(workspace)
            })
            .select('id')
            .single();

          if (insertError) {
            throw insertError;
          }

          currentProjectId = newProject.id;
        }

        useProjectStore.getState().setEntireState(
          workspace.scenarios,
          workspace.activeScenarioId,
          workspace.baseScenarioId
        );

        saveLocalStorageBackup(workspace);
        subscribeToCloudPersistence();
      } catch (error) {
        console.error(
          'Supabase persistence failed. Falling back to localStorage:',
          error
        );

        currentProjectId = null;
        subscribeToLocalPersistence();
      }
    })();

    return persistencePromise;
  };

export const flushProjectPersistence =
  async (): Promise<void> => {
    await initializeProjectPersistence();
    await saveQueue;
  };