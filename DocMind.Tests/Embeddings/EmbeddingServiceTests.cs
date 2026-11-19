namespace DocMind.Tests.Embeddings;


using DocMind.Core.Documents;
using DocMind.Core.Embeddings;
using Microsoft.Extensions.AI;

public class EmbeddingServiceTests
{
    public static TheoryData<string?, bool> BlankInputs => new()
    {
        { null, false },
        { "", false },
        { "   ", false },
        { null, true },
        { "", true },
        { "   ", true },
    };

    [Theory]
    [MemberData(nameof(BlankInputs))]
    public async Task BlankTextThrowsArgumentExceptionWithoutCallingTheModel(string? text, bool isQuery)
    {
        // A fake generator that throws if it is ever invoked proves validation happens on the raw
        // text, before the task prefix is added and before any call reaches Ollama.
        var service = new EmbeddingService(new UnreachableEmbeddingGenerator());

        _ = await Assert.ThrowsAsync<ArgumentException>(() => isQuery
            ? service.GenerateQueryEmbeddingAsync(text!)
            : service.GenerateDocumentEmbeddingAsync(text!));
    }

    [Fact]
    public async Task GenerateDocumentEmbeddingAsyncSendsSearchDocumentPrefix()
    {
        var generator = new CapturingEmbeddingGenerator();
        var service = new EmbeddingService(generator);

        _ = await service.GenerateDocumentEmbeddingAsync("DocMind stores PDFs in Postgres.");

        Assert.Equal("search_document: DocMind stores PDFs in Postgres.", Assert.Single(generator.Values));
    }

    [Fact]
    public async Task GenerateQueryEmbeddingAsyncSendsSearchQueryPrefix()
    {
        var generator = new CapturingEmbeddingGenerator();
        var service = new EmbeddingService(generator);

        _ = await service.GenerateQueryEmbeddingAsync("Where are PDFs stored?");

        Assert.Equal("search_query: Where are PDFs stored?", Assert.Single(generator.Values));
    }

    [Fact]
    public async Task GenerateQueryEmbeddingAsyncUnreachableOllamaThrowsInvalidOperationExceptionNamingTheModel()
    {
        var service = new EmbeddingService(new ThrowingEmbeddingGenerator());

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.GenerateQueryEmbeddingAsync("Where are PDFs stored?"));

        Assert.Contains("nomic-embed-text", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task GenerateDocumentAndQueryEmbeddingsReturnVectorsOfTheStoredSize()
    {
        // Requires a local Ollama instance running with the nomic-embed-text model pulled.
        var service = new EmbeddingService();

        var document = await service.GenerateDocumentEmbeddingAsync("The quick brown fox jumps over the lazy dog.");
        var query = await service.GenerateQueryEmbeddingAsync("What does the fox jump over?");

        Assert.Equal(DocumentChunk.EmbeddingDimensions, document.Length);
        Assert.Equal(DocumentChunk.EmbeddingDimensions, query.Length);
    }

    private sealed class UnreachableEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
    {
        public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
            IEnumerable<string> values, EmbeddingGenerationOptions? options = null, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("GenerateAsync must not be called for invalid input.");

        public object? GetService(Type serviceType, object? serviceKey = null) => null;

        public void Dispose()
        {
        }
    }

    // Records the exact text sent to the model and returns one vector per value.
    private sealed class CapturingEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
    {
        private static readonly float[] Vector = [1f];

        public List<string> Values { get; } = [];

        public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
            IEnumerable<string> values, EmbeddingGenerationOptions? options = null, CancellationToken cancellationToken = default)
        {
            var batch = values.ToList();
            this.Values.AddRange(batch);
            return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(
                batch.Select(_ => new Embedding<float>(Vector))));
        }

        public object? GetService(Type serviceType, object? serviceKey = null) => null;

        public void Dispose()
        {
        }
    }

    // Throws what OllamaSharp's HttpClient throws when Ollama isn't listening.
    private sealed class ThrowingEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
    {
        public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
            IEnumerable<string> values, EmbeddingGenerationOptions? options = null, CancellationToken cancellationToken = default)
            => throw new HttpRequestException("Connection refused");

        public object? GetService(Type serviceType, object? serviceKey = null) => null;

        public void Dispose()
        {
        }
    }
}
