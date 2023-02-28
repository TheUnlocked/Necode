import { PolicyValidatorConfig } from './PolicyValidatorConfig';

export interface PackageJson {
    name: string;
    displayName: string;
    version: string;
}

export interface NecodeJson {
    frontendRoot?: string;
    entry?: string;
    policyRoot?: string;
    policies?: {
        path: string;
        id: string;
        displayName: string;
        config?: PolicyValidatorConfig;
    }[];
    packageOverrides?: Partial<PackageJson>;
}