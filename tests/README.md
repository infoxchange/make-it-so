# Test Suite

This directory contains the comprehensive test suite for the make-it-so library after migration to SST v3 and Pulumi.

## Test Files

### deployConfig.test.ts

Tests the deployment configuration parsing from environment variables:

- **IX Deploy Configuration**: Tests parsing of IX-specific environment variables with strict validation
  - Valid configuration parsing for all environments (dev, test, uat, prod)
  - Workload group validation (ds, srs)
  - Domain parsing with comma-separated values
  - Error handling for invalid configurations
- **Non-IX Deploy Configuration**: Tests local/custom deployment configurations with relaxed validation
- **Dynamic Configuration**: Tests `getDeployConfig()` function for runtime re-evaluation

### dns.test.ts

Tests the IX DNS adapter that creates DNS records via IX's Lambda function:

- DNS adapter creation with various configurations (zone ID, override flag, transforms)
- Function availability (createAlias, createRecord, createCaa)
- CAA placeholder functionality

### InternalNetwork.test.ts

Tests the InternalNetwork Pulumi component:

- Class export and static method availability
- Configuration acceptance (transforms for security groups)
- VPC and subnet ID retrieval

### component-defaults.test.ts

Tests the SST component defaults setup:

- `setupComponentDefaults` function export and usage
- Transform callback invocation for each component type (StaticSite, Nextjs, Cloudflare.StaticSite)
- Error handling for missing arguments
- Component configuration handling

### proxy.test.ts

Tests the proxy fetch functionality:

- **setupProxyGlobally**: Tests global proxy dispatcher setup
  - Proxy configuration from environment variables
  - Idempotency
  - GLOBAL_AGENT environment variable setup
- **getProxiedFetch**: Tests proxied fetch function creation
  - Custom dispatcher warnings
  - Options preservation
- **Integration**: Tests both proxy methods working together

### integration.test.ts

Tests the overall package exports and integration:

- Main package exports (deployConfig, proxy functions, component defaults)
- IX components exports (dns, InternalNetwork)
- Full library integration with all exports working together

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- dns.test.ts

# Run tests in UI mode
npm test -- --ui
```

## Test Configuration

Tests are configured via [vitest.config.ts](../vitest.config.ts) with:

- Node environment
- Path alias support (`@/` → `src/`)
- Coverage reporting (v8 provider)
- Coverage exclusions for config files, dist, and test files

## Testing Approach

The test suite focuses on:

1. **Unit Testing**: Testing individual functions and modules in isolation
2. **API Surface Testing**: Ensuring exported APIs are correct and accessible
3. **Configuration Testing**: Validating environment variable parsing and configuration logic
4. **Integration Testing**: Verifying modules work together correctly

### Why Not Full Pulumi/AWS Integration Tests?

Full integration tests that actually create Pulumi resources or invoke AWS services are intentionally avoided because:

- They require complex mocking of Pulumi's runtime
- They're slow and can be flaky
- They require AWS credentials and actual infrastructure
- The library extends SST which is already well-tested
- Unit tests provide sufficient coverage for the logic we're responsible for

Instead, we focus on:

- Testing the configuration and transform logic
- Verifying correct API exports
- Ensuring proper error handling
- Testing business logic (like subnet ID selection based on workload group)

## Coverage

The test suite provides comprehensive coverage of:

- ✅ Environment variable parsing and validation (deployConfig)
- ✅ DNS adapter creation and configuration (dns)
- ✅ Proxy setup and fetch functionality (proxy)
- ✅ Component default transforms (component-defaults)
- ✅ InternalNetwork configuration (InternalNetwork)
- ✅ Package exports and integration (integration)

## Adding New Tests

When adding new features:

1. Create a new test file or add to existing one
2. Follow the existing test structure and naming conventions
3. Use `describe` blocks to group related tests
4. Use clear, descriptive test names
5. Test both success and error cases
6. Ensure tests are independent and can run in any order
7. Run tests locally before committing

Example:

```typescript
import { describe, it, expect } from "vitest";

describe("MyNewFeature", () => {
  it("should do something useful", () => {
    // Arrange
    const input = "test";

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```
