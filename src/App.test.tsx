import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import ImageCard from "./components/ImageCard";
import { RoadComponent } from "./components/Road";
import getCurrencies from "./lib/helper/getCurrency";
import { APIResponse } from "./types/response.type";

Element.prototype.scrollIntoView = jest.fn();

const mockFrance: APIResponse = {
  name: {
    common: "France",
    official: "French Republic",
    nativeName: { fra: { official: "République française", common: "France" } },
  },
  currencies: { EUR: { name: "Euro", symbol: "€" } },
  flags: { png: "france.png", svg: "france.svg", alt: "Flag of France" },
  coatOfArms: { png: "france-coa.png", svg: "france-coa.svg" },
  car: { signs: ["F"], side: "right" },
};

const mockAustralia: APIResponse = {
  name: {
    common: "Australia",
    official: "Commonwealth of Australia",
    nativeName: {},
  },
  currencies: { AUD: { name: "Australian Dollar", symbol: "$" } },
  flags: { png: "au.png", svg: "au.svg", alt: "Flag of Australia" },
  coatOfArms: { png: "au-coa.png", svg: "au-coa.svg" },
  car: { signs: ["AUS"], side: "left" },
};

function mockFetch(data: APIResponse[]) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

function mockFetch404() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => null,
  });
}

function mockFetch500() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => null,
  });
}

async function typeAndDebounce(text: string) {
  const input = screen.getByPlaceholderText(/France/i);
  userEvent.type(input, text);
  act(() => jest.advanceTimersByTime(500));
  return input;
}

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("App — initial render", () => {
  it("renders the header title", () => {
    render(<App />);
    expect(screen.getByText("Country Atlas")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/France/i)).toBeInTheDocument();
  });

  it("shows the empty-state prompt when nothing is selected", () => {
    render(<App />);
    expect(
      screen.getByText("Search for a country to get started"),
    ).toBeInTheDocument();
  });

  it("does not show the clear button when the input is empty", () => {
    render(<App />);
    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });

  it("does not call fetch on mount", () => {
    render(<App />);
    act(() => jest.advanceTimersByTime(500));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("App — search input", () => {
  it("shows the clear button once the user types", () => {
    render(<App />);
    userEvent.type(screen.getByPlaceholderText(/France/i), "f");
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("does NOT fetch for a single character", () => {
    render(<App />);
    userEvent.type(screen.getByPlaceholderText(/France/i), "f");
    act(() => jest.advanceTimersByTime(500));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows a loading indicator while fetching", async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<App />);
    await typeAndDebounce("fr");
    expect(screen.getByText("⏳")).toBeInTheDocument();
  });

  it("clears input + selection when the clear button is clicked", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    await typeAndDebounce("fr");
    await screen.findByText("France");
    fireEvent.mouseDown(screen.getByText("France"));
    await screen.findByText("French Republic");

    fireEvent.click(screen.getByText("✕"));

    expect(
      (screen.getByPlaceholderText(/France/i) as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryByText("French Republic")).not.toBeInTheDocument();
  });

  it("re-opens the dropdown on focus when results are already loaded", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    const input = screen.getByPlaceholderText(/France/i);
    await typeAndDebounce("fr");
    await screen.findByRole("list");

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("list")).not.toBeInTheDocument(),
    );

    fireEvent.focus(input);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});

describe("App — fetch and dropdown", () => {
  it("fetches and renders dropdown results after the debounce", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    await typeAndDebounce("fr");
    await screen.findByText("France");
    expect(screen.getByText("French Republic")).toBeInTheDocument();
  });

  it("sorts results alphabetically", async () => {
    mockFetch([mockFrance, mockAustralia]);
    render(<App />);
    await typeAndDebounce("au");
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Australia");
    expect(items[1]).toHaveTextContent("France");
  });

  it("includes the country flag image in each dropdown item", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    await typeAndDebounce("fr");
    const img = await screen.findByRole("img", { name: "" });
    expect(img).toHaveAttribute("src", "france.png");
  });

  it("shows 'No countries match' when the API returns 404", async () => {
    mockFetch404();
    render(<App />);
    await typeAndDebounce("xyz");
    await screen.findByText(/No countries match/i);
  });

  it("shows an error banner when the fetch fails with a 5xx", async () => {
    mockFetch500();
    render(<App />);
    await typeAndDebounce("fr");
    await screen.findByText(/Search failed/i);
  });

  it("closes the dropdown on Escape", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    const input = await typeAndDebounce("fr");
    await screen.findByRole("list");

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("list")).not.toBeInTheDocument(),
    );
  });
});

describe("App — keyboard navigation", () => {
  it("selects the first item with ArrowDown + Enter", async () => {
    mockFetch([mockAustralia, mockFrance]);
    render(<App />);
    const input = await typeAndDebounce("au");
    await screen.findByText("Australia");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText("Commonwealth of Australia");
  });

  it("navigates down and up with arrow keys", async () => {
    mockFetch([mockAustralia, mockFrance]);
    render(<App />);
    const input = await typeAndDebounce("au");
    await screen.findByText("Australia");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText("Commonwealth of Australia");
  });

  it("does not navigate above index 0", async () => {
    mockFetch([mockFrance]);
    render(<App />);
    const input = await typeAndDebounce("fr");
    await screen.findByText("France");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText("French Republic");
  });
});

describe("App — country detail panel", () => {
  async function renderAndSelectFrance() {
    mockFetch([mockFrance]);
    render(<App />);
    await typeAndDebounce("fr");
    await screen.findByText("France");
    fireEvent.mouseDown(screen.getByText("France"));
    await screen.findByText("French Republic");
  }

  it("shows the official name", async () => {
    await renderAndSelectFrance();
    expect(screen.getByText("French Republic")).toBeInTheDocument();
  });

  it("shows currency name and symbol", async () => {
    await renderAndSelectFrance();
    expect(screen.getByText("Euro")).toBeInTheDocument();
    expect(screen.getByText("€")).toBeInTheDocument();
  });

  it("shows 'Right side' for a right-hand traffic country", async () => {
    await renderAndSelectFrance();
    expect(screen.getByText(/Right\s+side/i)).toBeInTheDocument();
  });

  it("shows 'Left side' for a left-hand traffic country", async () => {
    mockFetch([mockAustralia]);
    render(<App />);
    await typeAndDebounce("au");
    await screen.findByText("Australia");
    fireEvent.mouseDown(screen.getByText("Australia"));
    await screen.findByText("Commonwealth of Australia");
    expect(screen.getByText(/Left\s+side/i)).toBeInTheDocument();
  });

  it("renders the flag image", async () => {
    await renderAndSelectFrance();
    expect(screen.getByAltText("Flag of France")).toBeInTheDocument();
  });

  it("renders the coat of arms image", async () => {
    await renderAndSelectFrance();
    expect(screen.getByAltText("Coat of arms of France")).toBeInTheDocument();
  });

  it("hides the empty-state prompt once a country is selected", async () => {
    await renderAndSelectFrance();
    expect(
      screen.queryByText("Search for a country to get started"),
    ).not.toBeInTheDocument();
  });
});

describe("ImageCard", () => {
  it("renders the label and image when src is provided", () => {
    render(<ImageCard src="flag.png" alt="Flag of Test" label="Flag" />);
    expect(screen.getByText("Flag")).toBeInTheDocument();
    expect(screen.getByAltText("Flag of Test")).toBeInTheDocument();
  });

  it("shows 'Not available' when no src is provided", () => {
    render(<ImageCard src="" alt="Flag of Test" label="Flag" />);
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });

  it("shows 'Not available' after an image load error", () => {
    render(<ImageCard src="broken.png" alt="Flag of Test" label="Flag" />);
    fireEvent.error(screen.getByAltText("Flag of Test"));
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });
});

describe("RoadComponent", () => {
  it("positions the car on the left for side='left'", () => {
    render(<RoadComponent side="left" />);
    expect(screen.getByText("🚗")).toHaveClass("self-start");
  });

  it("positions the car on the right for side='right'", () => {
    render(<RoadComponent side="right" />);
    expect(screen.getByText("🚗")).toHaveClass("self-end");
  });
});

describe("getCurrencies", () => {
  it("returns currency name and symbol", () => {
    const result = getCurrencies({ EUR: { name: "Euro", symbol: "€" } });
    expect(result).toEqual([{ name: "Euro", symbol: "€" }]);
  });

  it("returns N/A when currencies is undefined", () => {
    expect(getCurrencies(undefined)).toEqual([{ name: "N/A", symbol: "" }]);
  });

  it("returns N/A when currencies is an empty object", () => {
    expect(getCurrencies({})).toEqual([{ name: "N/A", symbol: "" }]);
  });

  it("handles a currency entry missing a symbol", () => {
    const result = getCurrencies({ USD: { name: "US Dollar" } });
    expect(result).toEqual([{ name: "US Dollar", symbol: "" }]);
  });

  it("handles multiple currencies", () => {
    const result = getCurrencies({
      EUR: { name: "Euro", symbol: "€" },
      GBP: { name: "Pound Sterling", symbol: "£" },
    });
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ name: "Euro", symbol: "€" });
    expect(result).toContainEqual({ name: "Pound Sterling", symbol: "£" });
  });
});
