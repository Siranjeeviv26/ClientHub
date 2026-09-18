import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Organization, OrganizationMember } from '../types';
import { organizationsApi } from '../api/organizations';
import api from '../services/api';

interface OrganizationContextType {
  organization: Organization | null;
  organizations: Organization[];
  members: OrganizationMember[];
  isLoading: boolean;
  setOrganization: (org: Organization) => void;
  loadOrganizations: () => Promise<void>;
  loadMembers: (organizationId: string) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setOrganization = useCallback((org: Organization) => {
    setOrganizationState(org);
    localStorage.setItem('organization', JSON.stringify(org));
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      const response = await organizationsApi.getAll();
      if (response.success && response.data) {
        const list = (response.data || []).filter((o: any) => o && o._id);
        setOrganizations(list);
        // Set current organization from localStorage or first org
        const storedOrg = localStorage.getItem('organization');
        if (storedOrg) {
          const parsed = JSON.parse(storedOrg);
          const found = list.find((o) => o._id === parsed._id);
          if (found) {
            setOrganizationState(found);
          } else if (list.length > 0) {
            setOrganizationState(list[0]);
          } else {
            setOrganizationState(null);
            localStorage.removeItem('organization');
          }
        } else if (list.length > 0) {
          setOrganizationState(list[0]);
        } else {
          setOrganizationState(null);
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  }, []);

  const loadMembers = useCallback(async (organizationId: string) => {
    try {
      const response = await organizationsApi.getMembers(organizationId);
      if (response.success && response.data) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, []);

  const switchOrganization = useCallback(async (organizationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const res = await api.post<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/switch-organization', { organizationId });
        if (res.success && res.data) {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }
      }
      const response = await organizationsApi.getById(organizationId);
      if (response.success && response.data) {
        setOrganization(response.data);
        await loadMembers(organizationId);
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  }, [setOrganization, loadMembers]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      await loadOrganizations();
      setIsLoading(false);
    };
    init();

    const handleAuthLogin = () => init();
    window.addEventListener('auth:login', handleAuthLogin);
    return () => window.removeEventListener('auth:login', handleAuthLogin);
  }, [loadOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizations,
        members,
        isLoading,
        setOrganization,
        loadOrganizations,
        loadMembers,
        switchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}