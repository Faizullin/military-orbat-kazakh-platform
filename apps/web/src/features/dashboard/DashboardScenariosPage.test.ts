// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import DashboardScenariosPage from "./DashboardScenariosPage.vue";

const storedScenariosMock = ref<
  Array<{
    id: string;
    name: string;
    description: string;
    image: string;
    modified: Date;
    created: Date;
  }>
>([]);
const onActionMock = vi.fn();
const onBulkActionMock = vi.fn();
const toggleSortDirectionMock = vi.fn();

vi.mock("@/composables/browserScenarios", () => ({
  useBrowserScenarios: () => ({
    storedScenarios: storedScenariosMock,
    sortOptions: [],
    sortDirection: ref("desc"),
    toggleSortDirection: toggleSortDirectionMock,
    onAction: onActionMock,
    onBulkAction: onBulkActionMock,
  }),
}));

const StoredScenarioBrowserStub = defineComponent({
  name: "StoredScenarioBrowser",
  props: ["scenarios"],
  template: `<div data-testid="stored-scenario-browser">{{ scenarios.length }}</div>`,
});

function mountPage() {
  return mount(DashboardScenariosPage, {
    global: {
      stubs: {
        RouterLink: defineComponent({
          props: ["to"],
          template: `<a :data-to="JSON.stringify(to)"><slot /></a>`,
        }),
        StoredScenarioBrowser: StoredScenarioBrowserStub,
      },
    },
  });
}

describe("DashboardScenariosPage", () => {
  beforeEach(() => {
    storedScenariosMock.value = [];
    onActionMock.mockReset();
    onBulkActionMock.mockReset();
    toggleSortDirectionMock.mockReset();
  });

  it("renders the main create/import actions in the header", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain("New scenario");
    expect(wrapper.text()).toContain("Import");
    expect(wrapper.text()).toContain("Scenarios");
  });

  it("renders the stored scenario browser when scenarios exist", () => {
    storedScenariosMock.value = [
      {
        id: "scenario-1",
        name: "Scenario 1",
        description: "",
        image: "",
        modified: new Date(),
        created: new Date(),
      },
    ];

    const wrapper = mountPage();

    expect(wrapper.get('[data-testid="stored-scenario-browser"]').text()).toBe("1");
    expect(wrapper.text()).not.toContain("No scenarios found.");
  });

  it("shows a simplified empty state with create/import actions when no scenarios exist", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain("No scenarios found.");
    expect(wrapper.text()).toContain("Create scenario");
    expect(wrapper.text()).toContain("Import scenario");
  });
});
