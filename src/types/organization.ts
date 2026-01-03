export interface OrganizationBranding {
    primaryColor?: string; // Hex color e.g. "#6366f1"
    accentColor?: string;
    logoUrl?: string;
    companyName?: string; // Override display name
    favicon?: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    theme: 'default' | 'cartoon' | 'neon' | 'retro';
    branding?: OrganizationBranding;
    features: {
        financials: boolean;
        crm: boolean;
        tasks: boolean;
        creatives: boolean;
        goals: boolean;
        insights: boolean;
        profiles: boolean;
        quotes: boolean;
        expenses: boolean;
        logins: boolean;
        recovery: boolean;
    };
    createdAt: any; // Timestamp
    updatedAt: any; // Timestamp
}

export interface Partner {
    name: string;
    percentage: number; // 0-100
    userId?: string; // Optional link to auth user
}

export type AdCostMode = 'reimburse_payer' | 'split_among_partners' | 'solo';
export type OperationCategory = 'infoproduct' | 'saas' | 'local_business' | 'course' | 'extra_income' | 'other';

export interface Operation {
    id: string;
    orgId: string;
    name: string; // e.g., "Madames Online - Front"
    category: OperationCategory;
    partners: Partner[];
    active: boolean;

    // Ad cost configuration (solves the "Cabral pays ads" problem generically)
    adPayer?: string; // Partner name who pays for ads (if applicable)
    adCostMode: AdCostMode; // How to handle ad spend

    // Company cash reserve configuration
    cashReservePercentage?: number; // 0-100, percentage of net profit to allocate to company cash before partner distribution

    // Optional fields for future SaaS features
    currency?: string; // e.g., "BRL", "USD"
    timezone?: string; // e.g., "America/Sao_Paulo"
    color?: string; // For visual organization

    createdAt: any; // Timestamp
    updatedAt: any; // Timestamp
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface OrganizationMember {
    id: string; // email (used as ID for uniqueness/invites)
    email: string;
    name?: string;
    role: MemberRole;
    status: 'pending' | 'active';
    userId?: string; // Linked Firebase Auth UID
    addedAt: any; // Timestamp
}
