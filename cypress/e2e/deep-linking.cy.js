describe('Deep Linking', () => {
  // Test model data
  const testModel = {
    id: 'test-model-123',
    thumbnail: '/placeholder.jpg',
    status: 'draft',
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    photoSet: {},
    processingStage: 'uploading_photos'
  };

  before(() => {
    // Set up test data before all tests
    cy.request('POST', '/api/test-data/setup', {
      models: [testModel]
    });
  });

  after(() => {
    // Clean up test data after all tests
    cy.request('POST', '/api/test-data/cleanup');
  });

  it('opens gallery view from URL', () => {
    cy.visit('/?view=gallery');
    cy.get('[data-testid="gallery-view"]').should('exist');
  });

  it('opens upload view from URL', () => {
    cy.visit('/?view=upload');
    cy.get('[data-testid="upload-view"]').should('exist');
  });

  it('opens model generator from URL', () => {
    cy.visit(`/?view=generator&modelId=${testModel.id}`);
    cy.get('[data-testid="generator-view"]').should('exist');
    cy.contains('3D Model').should('be.visible');
  });

  it('opens model preview from URL', () => {
    // Update model to completed status for preview
    cy.request('PATCH', `/api/test-data/model/${testModel.id}`, {
      status: 'completed',
      modelUrl: '/test-model.glb'
    });

    cy.visit(`/?view=preview&modelId=${testModel.id}`);
    cy.get('[data-testid="preview-view"]').should('exist');
    cy.contains('Model Preview').should('be.visible');
  });

  it('handles invalid view parameter', () => {
    cy.visit('/?view=invalid');
    // Should default to gallery view
    cy.get('[data-testid="gallery-view"]').should('exist');
  });

  it('handles invalid modelId parameter', () => {
    cy.visit('/?view=generator&modelId=invalid-id');
    cy.get('[data-testid="error-message"]').should('contain', 'Model not found');
  });

  it('maintains state during browser navigation', () => {
    cy.visit('/?view=gallery');
    cy.get('[data-testid="gallery-view"]').should('exist');
    
    cy.visit(`/?view=generator&modelId=${testModel.id}`);
    cy.get('[data-testid="generator-view"]').should('exist');
    
    cy.go('back');
    cy.get('[data-testid="gallery-view"]').should('exist');
    
    cy.go('forward');
    cy.get('[data-testid="generator-view"]').should('exist');
  });
});
