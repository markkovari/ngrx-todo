Feature: Kubernetes E2E - Todo application deployed via Helm

  Background:
    Given the todo application is deployed on Kubernetes

  Scenario: API health check returns empty todos
    When I request the list of todos from the API
    Then the API should return a successful response
    And the response should be an empty list

  Scenario: Create and verify a todo via the API
    When I create a todo with name "k8s-e2e-test-todo"
    Then the API should return a successful response
    And the created todo should have name "k8s-e2e-test-todo"
    When I request the list of todos from the API
    Then the list should contain a todo with name "k8s-e2e-test-todo"

  Scenario: Frontend is accessible and functional
    When I navigate to the frontend
    Then the page should load successfully
    And I should see the todo input field

  Scenario: Adding a todo through the frontend on Kubernetes
    When I navigate to the frontend
    And I enter "k8s-bdd-todo" into the todo input field
    And I click the add button
    Then I should see "k8s-bdd-todo" in the todo list

  Scenario: Toggle and delete a todo
    When I create a todo with name "toggle-delete-test"
    And I toggle the todo "toggle-delete-test"
    Then the toggle should succeed
    When I delete the todo "toggle-delete-test"
    Then the deletion should succeed
    And the todo "toggle-delete-test" should not exist in the list
